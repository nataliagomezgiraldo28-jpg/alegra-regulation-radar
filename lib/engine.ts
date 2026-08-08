import crypto from "crypto";
import { Analisis, Change, Notification, Source } from "./types";
import { getSnapshot, saveSnapshot, saveChange, saveNotification } from "./store";

// =============================================================================
// MOTOR DEL RADAR — vigilar → detectar → interpretar → notificar
// =============================================================================

// ---------- 1) DETECTAR ------------------------------------------------------
// Descarga la página oficial, extrae su texto y lo compara (hash) contra el
// último snapshot guardado. Si cambió, devuelve el diff a nivel de línea.
export async function detectChange(source: Source): Promise<{
  cambio: boolean;
  textoActual: string;
  hashActual: string;
  diff: string;
} | null> {
  if (source.adapter !== "html") return null; // fuentes "seed-only" aún no vigiladas en vivo

  let html = "";
  try {
    const res = await fetch(source.fuenteUrl, {
      headers: { "User-Agent": "Alegra-RadarRegulatorio/1.0 (+monitoreo normativo)" },
      // 20s para páginas gubernamentales lentas
      signal: AbortSignal.timeout(20000),
    });
    html = await res.text();
  } catch (e) {
    console.warn(`[detect] no se pudo leer ${source.id}:`, (e as Error).message);
    return null;
  }

  const textoActual = normalizar(html);
  const hashActual = crypto.createHash("sha256").update(textoActual).digest("hex");

  const prev = await getSnapshot(source.id);
  // Primera vez: guardamos baseline y no reportamos cambio.
  if (!prev) {
    await saveSnapshot({ sourceId: source.id, hash: hashActual, texto: textoActual, capturadoEn: new Date().toISOString() });
    return { cambio: false, textoActual, hashActual, diff: "" };
  }

  if (prev.hash === hashActual) return { cambio: false, textoActual, hashActual, diff: "" };

  const diff = diffLineas(prev.texto, textoActual);
  await saveSnapshot({ sourceId: source.id, hash: hashActual, texto: textoActual, capturadoEn: new Date().toISOString() });
  return { cambio: true, textoActual, hashActual, diff };
}

// Extrae texto legible del HTML (sin scripts/estilos/tags) y normaliza espacios.
function normalizar(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Diff simple a nivel de "oración". Suficiente para señalar qué apareció/desapareció.
function diffLineas(antes: string, ahora: string): string {
  const a = new Set(antes.split(/(?<=[.;:])\s+/));
  const b = ahora.split(/(?<=[.;:])\s+/);
  const nuevas = b.filter((l) => l.length > 8 && !a.has(l)).slice(0, 8);
  return nuevas.length ? nuevas.map((l) => "+ " + l).join("\n") : "(cambio detectado sin líneas nuevas evidentes)";
}

// ---------- 2) INTERPRETAR (Claude) -----------------------------------------
// Convierte un diff crudo en impacto de producto + RIA/RRD/Gap.
// Si no hay ANTHROPIC_API_KEY, degrada a una interpretación base.
export async function interpret(source: Source, diff: string): Promise<Partial<Change>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return interpretacionBase(source, diff);

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const system =
    `Eres analista de Product Regulation en Alegra (SaaS de facturación para LATAM). ` +
    `Traduces un cambio normativo en accionables de producto. Sé claro, sin jerga innecesaria. ` +
    `Productos posibles afectados: ${source.productosPosibles.join(", ")}. ` +
    `Responde SOLO con JSON válido, sin markdown.`;
  const prompt =
    `Fuente oficial: ${source.fuenteNombre} (${source.pais}). ` +
    `Cambio detectado:\n${diff}\n\n` +
    `Devuelve este JSON:\n{` +
    `"titulo": string (plano, <90 chars),` +
    `"severidad": "alta"|"media"|"baja",` +
    `"quePaso": string (qué cambió, 1-2 frases),` +
    `"queSignifica": string (impacto para el usuario de Alegra, 1-2 frases),` +
    `"queHacer": string[] (2-4 acciones para Producto),` +
    `"productos": string[] (subset de los posibles),` +
    `"ria": [[string,string]], "rrd": [[string,string]],` +
    `"rrdAccept": string, "gap": {"actual":string,"requerido":string,"brecha":string,"esfuerzo":string,"prioridad":string}}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const txt = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const json = JSON.parse(txt.replace(/```json|```/g, "").trim());
    const analisis: Analisis = {
      ria: json.ria || [], rrd: json.rrd || [], rrdAccept: json.rrdAccept || "",
      gap: json.gap || { actual: "", requerido: "", brecha: "", esfuerzo: "", prioridad: "" },
    };
    return {
      titulo: json.titulo, severidad: json.severidad, quePaso: json.quePaso,
      queSignifica: json.queSignifica, queHacer: json.queHacer, productos: json.productos, analisis,
    };
  } catch (e) {
    console.warn(`[interpret] Claude falló para ${source.id}, uso base:`, (e as Error).message);
    return interpretacionBase(source, diff);
  }
}

function interpretacionBase(source: Source, diff: string): Partial<Change> {
  return {
    titulo: `Cambio detectado en ${source.fuenteNombre}`,
    severidad: "media",
    quePaso: `Se detectó una diferencia en la publicación oficial de ${source.entidad}.`,
    queSignifica: "Puede afectar la validación o los campos requeridos del producto. Requiere revisión del equipo.",
    queHacer: ["Revisar el diff detectado contra la norma vigente.", "Confirmar impacto con Ingeniería."],
    productos: source.productosPosibles.slice(0, 2),
    analisis: {
      ria: [["Cambio", diff.slice(0, 300)], ["A quién afecta", `Usuarios de Alegra en ${source.pais}.`]],
      rrd: [["R1", "Mapear el cambio a reglas del producto (pendiente de análisis)."]],
      rrdAccept: "Criterio de aceptación por definir con el equipo.",
      gap: { actual: "Por confirmar.", requerido: "Alineado a la publicación vigente.", brecha: "Por mapear.", esfuerzo: "Por estimar.", prioridad: "Media." },
    },
  };
}

// ---------- 3) NOTIFICAR (Google Chat) --------------------------------------
// Envía la alerta al webhook del espacio de Product Regulation y, si hay
// webhooks por squad, rutea también al squad del producto afectado.
export async function notify(change: Change, source: Source): Promise<Notification> {
  const texto =
    `🔴 *Radar Regulatorio · ${source.pais} (${source.entidad.split(" ")[0]})*\n` +
    `*${change.titulo}*\n` +
    `Qué implica: ${change.queSignifica}\n` +
    `Productos: ${change.productos.join(", ")}\n` +
    `Fuente oficial: ${source.fuenteUrl}`;

  await postChat(process.env.GOOGLE_CHAT_WEBHOOK, texto);
  // Ruteo por squad (opcional): GOOGLE_CHAT_WEBHOOK_FACTURACION, _NOMINA, _POS...
  for (const prod of change.productos) {
    const envKey = "GOOGLE_CHAT_WEBHOOK_" + prod.split(" ")[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (process.env[envKey]) await postChat(process.env[envKey], texto);
  }

  const n: Notification = {
    id: "n-" + change.id,
    sourceId: source.id,
    tone: "alert",
    titulo: `${source.pais} · ${source.entidad.split(" ")[0]}`,
    detalle: change.titulo,
    cuando: "ahora",
    leido: false,
  };
  await saveNotification(n);
  return n;
}

async function postChat(webhook: string | undefined, text: string) {
  if (!webhook) return; // sin webhook, no rompe: el cambio igual queda en el dashboard
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.warn("[notify] webhook falló:", (e as Error).message);
  }
}

// ---------- LOOP COMPLETO ----------------------------------------------------
export async function runRadar(sources: Source[]) {
  const detectados: { sourceId: string; titulo: string }[] = [];
  for (const source of sources) {
    const det = await detectChange(source);
    if (!det || !det.cambio) continue;

    const interp = await interpret(source, det.diff);
    const change: Change = {
      id: `${source.id}-${Date.now()}`,
      sourceId: source.id,
      severidad: interp.severidad || "media",
      titulo: interp.titulo || `Cambio en ${source.fuenteNombre}`,
      vigencia: "Detectado por el radar",
      quePaso: interp.quePaso || "",
      queSignifica: interp.queSignifica || "",
      queHacer: interp.queHacer || [],
      productos: interp.productos || source.productosPosibles.slice(0, 2),
      diff: det.diff,
      detectadoEn: new Date().toISOString(),
      analisis: interp.analisis!,
    };
    await saveChange(change);
    await notify(change, source);
    detectados.push({ sourceId: source.id, titulo: change.titulo });
  }
  return detectados;
}
