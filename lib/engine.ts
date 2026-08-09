import crypto from "crypto";
import { Change, Notification, Source } from "./types";
import { saveSnapshot, saveChange, saveNotification, getState, getSnapshot } from "./store";
import { SEED_CHANGES } from "./seed";

// =============================================================================
// MOTOR DEL RADAR
// "Revisar ahora" / cron:
//   1) Lee la fuente oficial EN VIVO (prueba de lectura real, actualiza snapshot).
//   2) Verifica los cambios REALES conocidos de cada fuente:
//        - si ya están en el historial  -> no los duplica.
//        - si NO están (los borraste o son nuevos) -> los vuelve a traer solos.
// Así el cambio real siempre es recuperable sin tocar la base de datos.
// =============================================================================

function normalizar(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Lectura en vivo: descarga la página oficial y guarda su "foto" (snapshot).
export async function liveRead(source: Source): Promise<boolean> {
  if (source.adapter !== "html") return false;
  try {
    const res = await fetch(source.fuenteUrl, {
      headers: { "User-Agent": "Alegra-RegulationRadar/1.0 (+monitoreo normativo)" },
      signal: AbortSignal.timeout(15000),
    });
    const texto = normalizar(await res.text());
    const hash = crypto.createHash("sha256").update(texto).digest("hex");
    await saveSnapshot({ sourceId: source.id, hash, texto, capturadoEn: new Date().toISOString() });
    return true;
  } catch (e) {
    console.warn(`[liveRead] ${source.id}:`, (e as Error).message);
    return false;
  }
}

function notifFor(c: Change, s: Source): Notification {
  return {
    id: "n-" + c.id,
    sourceId: s.id,
    tone: "alert",
    titulo: `${s.pais} · ${s.entidad.split(" ")[0]}`,
    detalle: c.titulo,
    cuando: "ahora",
    leido: false,
  };
}

async function postChat(webhook: string | undefined, text: string) {
  if (!webhook) return;
  try {
    await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
  } catch (e) {
    console.warn("[notify] webhook falló:", (e as Error).message);
  }
}

export async function notifyChat(c: Change, s: Source) {
  const texto =
    `🔴 *Alegra Regulation Radar · ${s.pais} (${s.entidad.split(" ")[0]})*\n` +
    `*${c.titulo}*\n` +
    `Qué implica: ${c.queSignifica}\n` +
    `Productos: ${c.productos.join(", ")}\n` +
    `Fuente oficial: ${s.fuenteUrl}`;
  await postChat(process.env.GOOGLE_CHAT_WEBHOOK, texto);
  for (const prod of c.productos) {
    const key = "GOOGLE_CHAT_WEBHOOK_" + prod.split(" ")[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (process.env[key]) await postChat(process.env[key], texto);
  }
}

// Interpretación con IA (Claude). Se usa para cambios nuevos/desconocidos.
export async function interpret(source: Source, diff: string): Promise<Partial<Change>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return {};
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const system =
    `Eres analista de Product Regulation en Alegra (SaaS de facturación LATAM). ` +
    `Traduces un cambio normativo en accionables de producto, claro y sin jerga. ` +
    `Productos posibles: ${source.productosPosibles.join(", ")}. Responde SOLO JSON válido.`;
  const prompt =
    `Fuente oficial: ${source.fuenteNombre} (${source.pais}). Cambio detectado:\n${diff}\n\n` +
    `Devuelve JSON: {"titulo":string,"severidad":"alta"|"media"|"baja","quePaso":string,"queSignifica":string,` +
    `"queHacer":string[],"productos":string[],"ria":[[string,string]],"rrd":[[string,string]],"rrdAccept":string,` +
    `"gap":{"actual":string,"requerido":string,"brecha":string,"esfuerzo":string,"prioridad":string}}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await res.json();
    const txt = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const j = JSON.parse(txt.replace(/```json|```/g, "").trim());
    return {
      titulo: j.titulo, severidad: j.severidad, quePaso: j.quePaso, queSignifica: j.queSignifica,
      queHacer: j.queHacer, productos: j.productos,
      analisis: { ria: j.ria || [], rrd: j.rrd || [], rrdAccept: j.rrdAccept || "", gap: j.gap || { actual: "", requerido: "", brecha: "", esfuerzo: "", prioridad: "" } },
    };
  } catch (e) {
    console.warn(`[interpret] ${source.id}:`, (e as Error).message);
    return {};
  }
}

// =============================================================================
// DIAN EN VIVO (vía Firecrawl) — lectura real de la normatividad + filtro con IA
// A prueba de fallos: cualquier error se registra y NO afecta al resto del radar.
// =============================================================================

type Norma = { id: string; titulo: string; url: string; desc: string; anio: number };

// Extrae cada norma del markdown que devuelve Firecrawl: [**Título**](url) descripción
export function parseNormas(md: string): Norma[] {
  const re = /\[\*\*(.+?)\*\*\]\((https?:\/\/[^\)]+)\)\s*([^\[]*)/g;
  const out: Norma[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const titulo = m[1].trim();
    const url = m[2].trim();
    const desc = m[3].replace(/\s+/g, " ").trim().slice(0, 240);
    if (!/resoluci|circular|decreto|ley|anexo/i.test(titulo)) continue; // solo normas
    const anios = (titulo + " " + desc).match(/\b20\d{2}\b/g);
    const anio = anios ? Math.max(...anios.map(Number)) : 0;
    const id = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    out.push({ id, titulo, url, desc, anio });
  }
  // Más recientes primero (monitoreo actual): prioriza 2026, 2025, etc.
  out.sort((a, b) => b.anio - a.anio);
  return out;
}

// Pregunta a Claude cuál norma es relevante para Alegra e interpreta (RIA/RRD/Gap).
async function interpretDianList(source: Source, normas: Norma[]): Promise<any | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const lista = normas.map((n, i) => `${i}. [${n.anio || "s/f"}] ${n.titulo} — ${n.desc}`).join("\n");
  const system =
    `Eres analista de Product Regulation en Alegra (SaaS de facturación LATAM). ` +
    `Productos: ${source.productosPosibles.join(", ")}. Respondes SOLO JSON válido, sin texto adicional.`;
  const prompt =
    `Esta es una lista de normas de la DIAN para MONITOREO ACTUAL. Elige la MÁS RECIENTE y relevante para los productos de Alegra ` +
    `(prioriza 2026, luego 2025; ignora normas de años anteriores salvo que no haya nada reciente). Interprétala. ` +
    `Si ninguna reciente es claramente relevante, elige la más reciente disponible y marca "relevante":false.\n\n${lista}\n\n` +
    `Devuelve JSON: {"index":number,"relevante":boolean,"titulo":string,"severidad":"alta"|"media"|"baja",` +
    `"quePaso":string,"queSignifica":string,"queHacer":string[],"productos":string[],` +
    `"ria":[[string,string]],"rrd":[[string,string]],"rrdAccept":string,` +
    `"gap":{"actual":string,"requerido":string,"brecha":string,"esfuerzo":string,"prioridad":string}}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await res.json();
    const txt = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const j = JSON.parse(txt.replace(/```json|```/g, "").trim());
    if (typeof j.index !== "number") j.index = 0;
    return j;
  } catch (e) {
    console.warn("[dian interpret]", (e as Error).message);
    return null;
  }
}

function buildDianChange(source: Source, n: Norma, ai: any, total: number): Change {
  return {
    id: "co-dian-live-" + n.id,
    sourceId: source.id,
    severidad: ai?.severidad || "media",
    titulo: ai?.titulo || `DIAN · ${n.titulo}`,
    vigencia: "Detectada en vivo desde la DIAN",
    quePaso:
      (ai?.quePaso ? ai.quePaso + " " : "") +
      `El radar leyó en vivo la normatividad oficial de la DIAN (${total} normas monitoreadas) e identificó esta como relevante para Alegra: ${n.titulo}. ${n.desc} · Documento oficial (PDF): ${n.url}`,
    queSignifica: ai?.queSignifica || "Cambio normativo publicado por la DIAN que puede afectar la operación de facturación electrónica en Alegra.",
    queHacer: [...((ai?.queHacer && ai.queHacer.length) ? ai.queHacer : ["Revisar el documento oficial contra la norma vigente.", "Validar el impacto con Ingeniería."]), `Abrir el documento oficial (PDF): ${n.url}`],
    productos: (ai?.productos && ai.productos.length) ? ai.productos : source.productosPosibles.slice(0, 2),
    detectadoEn: new Date().toISOString(),
    estadoCambio: "activo",
    documentoTipo: "Resolución/Circular DIAN",
    documentoNumero: n.titulo,
    documentoNombre: `DIAN · ${n.titulo}`,
    documentoUrl: n.url,
    linkDirecto: true,
    analisis: {
      ria: ai?.ria || [["Fuente y referencia", `DIAN · ${n.titulo}. ${n.url}`], ["Cambio", n.desc]],
      rrd: ai?.rrd || [["R1", "Mapear el cambio a las reglas del producto."]],
      rrdAccept: ai?.rrdAccept || "Criterio de aceptación a validar con el equipo.",
      gap: ai?.gap || { actual: "Por confirmar con Ingeniería.", requerido: "Alineado a la norma vigente.", brecha: "Por mapear.", esfuerzo: "Por estimar.", prioridad: "Media." },
    },
  };
}

// Lee la DIAN en vivo con Firecrawl, detecta normas nuevas y filtra con IA lo relevante.
export async function scanDianLive(source: Source): Promise<{ sourceId: string; titulo: string }[]> {
  const detectados: { sourceId: string; titulo: string }[] = [];
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) { console.warn("[dian] falta FIRECRAWL_API_KEY"); return detectados; }
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ url: source.fuenteUrl, formats: ["markdown"] }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await res.json();
    const md: string = data?.data?.markdown || data?.markdown || "";
    const normas = parseNormas(md);
    if (!normas.length) { console.warn("[dian] no se parsearon normas"); return detectados; }

    const snap = await getSnapshot(source.id);
    let baseline: string[] = [];
    try { baseline = snap?.texto ? JSON.parse(snap.texto) : []; } catch { baseline = []; }
    const baseSet = new Set(baseline);
    const allIds = normas.map((n) => n.id);

    const st = await getState();
    const existing = new Set(st.changes.map((c) => c.id));

    const targets: { norma: Norma; ai: any }[] = [];
    if (!baseSet.size) {
      // Primera lectura: la IA elige la más relevante para mostrar una detección real.
      const pick = await interpretDianList(source, normas);
      const idx = pick && typeof pick.index === "number" ? pick.index : 0;
      if (normas[idx]) targets.push({ norma: normas[idx], ai: pick });
    } else {
      // Corridas siguientes: normas nuevas respecto a la base (máx 3), filtradas por IA.
      const nuevas = normas.filter((n) => !baseSet.has(n.id)).slice(0, 3);
      for (const nrm of nuevas) {
        const ai = await interpretDianList(source, [nrm]);
        if (!ai || ai.relevante !== false) targets.push({ norma: nrm, ai: ai ? { ...ai, index: 0 } : null });
      }
    }

    for (const t of targets) {
      const change = buildDianChange(source, t.norma, t.ai, normas.length);
      if (!existing.has(change.id)) {
        await saveChange(change);
        await saveNotification(notifFor(change, source));
        await notifyChat(change, source);
        existing.add(change.id);
        detectados.push({ sourceId: source.id, titulo: change.titulo });
      }
    }

    // Actualiza la base con la lista completa vista hoy.
    await saveSnapshot({ sourceId: source.id, hash: String(allIds.length), texto: JSON.stringify(allIds), capturadoEn: new Date().toISOString() });
  } catch (e) {
    console.warn("[dian] scan falló:", (e as Error).message);
  }
  return detectados;
}

// RUN RADAR — lee en vivo + recupera/detecta los cambios reales conocidos.
export async function runRadar(sources: Source[]) {
  const detectados: { sourceId: string; titulo: string }[] = [];
  const st = await getState();
  const existing = new Set(st.changes.map((c) => c.id));

  for (const source of sources) {
    if (source.adapter === "firecrawl") {
      const d = await scanDianLive(source); // lectura real vía Firecrawl + filtro IA
      for (const x of d) detectados.push(x);
      continue;
    }
    await liveRead(source); // lectura en vivo real
    const conocidos = SEED_CHANGES.filter((c) => c.sourceId === source.id);
    for (const kc of conocidos) {
      if (!existing.has(kc.id)) {
        const change: Change = { ...kc, estadoCambio: "activo", detectadoEn: kc.detectadoEn };
        await saveChange(change);
        await saveNotification(notifFor(change, source));
        await notifyChat(change, source);
        existing.add(kc.id);
        detectados.push({ sourceId: source.id, titulo: kc.titulo });
      }
    }
  }
  return detectados;
}

// SIMULAR — agrega un ejemplo limpio (contenido real conocido), etiquetado como simulación.
export async function simulateChange(source: Source): Promise<Change> {
  const known = SEED_CHANGES.find((c) => c.sourceId === source.id);
  const base: Change =
    known ||
    ({
      id: "", sourceId: source.id, severidad: "media", titulo: "", vigencia: "Detección simulada",
      quePaso: `Ejemplo de detección sobre ${source.fuenteNombre}.`,
      queSignifica: "Ejemplo del impacto que el radar interpretaría ante un cambio en esta fuente.",
      queHacer: ["Revisar el cambio contra la norma vigente.", "Confirmar impacto con Ingeniería."],
      productos: source.productosPosibles.slice(0, 2),
      detectadoEn: new Date().toISOString(),
      analisis: { ria: [["Cambio", "Ejemplo de detección para demostración."], ["A quién afecta", `Usuarios de Alegra en ${source.pais}.`]], rrd: [["R1", "Mapear el cambio a reglas del producto."]], rrdAccept: "Criterio por definir con el equipo.", gap: { actual: "Por confirmar.", requerido: "Alineado a la fuente.", brecha: "Por mapear.", esfuerzo: "Por estimar.", prioridad: "Media." } },
    } as Change);

  const change: Change = {
    ...base,
    id: `${source.id}-sim-${Date.now()}`,
    titulo: known ? `${known.titulo} (ejemplo)` : `Ejemplo de detección en ${source.entidad.split(" ")[0]}`,
    detectadoEn: new Date().toISOString(),
    estadoCambio: "activo",
    simulacion: true,
  };
  await saveChange(change);
  await saveNotification(notifFor(change, source));
  return change;
}
