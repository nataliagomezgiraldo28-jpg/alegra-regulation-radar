import crypto from "crypto";
import { Change, Notification, Source } from "./types";
import { saveSnapshot, saveChange, saveNotification, getState } from "./store";
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

// RUN RADAR — lee en vivo + recupera/detecta los cambios reales conocidos.
export async function runRadar(sources: Source[]) {
  const detectados: { sourceId: string; titulo: string }[] = [];
  const st = await getState();
  const existing = new Set(st.changes.map((c) => c.id));

  for (const source of sources) {
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
