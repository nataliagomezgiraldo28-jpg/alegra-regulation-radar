import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SOURCES } from "./sources";
import { SEED_CHANGES, SEED_NOTIFICATIONS, SEED_OK_DESDE, SEED_SNAPSHOTS } from "./seed";
import { Change, Estado, Notification, RadarState, Snapshot } from "./types";

// -----------------------------------------------------------------------------
// STORE — abstracción de datos con degradación elegante.
//
//   Si SUPABASE_URL + SUPABASE_SERVICE_KEY existen -> persiste en Supabase.
//   Si no                                          -> usa el SEED (en memoria).
//
// Así el repo se despliega y se ve completo SIN configurar nada, y se vuelve
// "vivo" (persistente) apenas conectas Supabase.
// -----------------------------------------------------------------------------

let _sb: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

export const modo = (): "seed" | "supabase" => (supabase() ? "supabase" : "seed");

// --- Lectura del estado completo para el dashboard ---------------------------
export async function getState(): Promise<RadarState> {
  const sb = supabase();
  let changes: Change[] = SEED_CHANGES;
  let notifications: Notification[] = SEED_NOTIFICATIONS;

  if (sb) {
    const [{ data: ch }, { data: nt }] = await Promise.all([
      sb.from("changes").select("*").order("detectado_en", { ascending: false }),
      sb.from("notifications").select("*").order("cuando", { ascending: false }),
    ]);
    if (ch?.length) changes = ch.map(rowToChange);
    if (nt?.length) notifications = nt.map(rowToNotif);
  }

  const changedIds = new Set(changes.filter((c) => !c.atendido).map((c) => c.sourceId));
  // En modo seed dejamos México "listo para comparar" para que el botón "Revisar
  // ahora" muestre la detección en vivo en la demo. En Supabase manda la BD.
  const revealSeed = new Set(modo() === "seed" ? ["mx"] : []);

  const sources = SOURCES.map((s) => {
    const estado: Estado = revealSeed.has(s.id)
      ? "base"
      : changedIds.has(s.id)
      ? "cambio"
      : "ok";
    return {
      ...s,
      estado,
      ultimaRevision: "hace un momento",
      okDesde: SEED_OK_DESDE[s.id],
    };
  });

  return {
    sources,
    changes,
    notifications,
    meta: {
      ultimaRevision: new Date().toISOString(),
      proxima: "en ~12 h",
      modo: modo(),
    },
  };
}

// --- Snapshots ---------------------------------------------------------------
export async function getSnapshot(sourceId: string): Promise<Snapshot | null> {
  const sb = supabase();
  if (!sb) return SEED_SNAPSHOTS.find((s) => s.sourceId === sourceId) ?? null;
  const { data } = await sb.from("snapshots").select("*").eq("source_id", sourceId).single();
  return data ? { sourceId, hash: data.hash, texto: data.texto, capturadoEn: data.capturado_en } : null;
}

export async function saveSnapshot(snap: Snapshot) {
  const sb = supabase();
  if (!sb) return; // en modo seed no persiste (stateless)
  await sb.from("snapshots").upsert({
    source_id: snap.sourceId,
    hash: snap.hash,
    texto: snap.texto,
    capturado_en: snap.capturadoEn,
  });
}

export async function saveChange(c: Change) {
  const sb = supabase();
  if (!sb) return;
  await sb.from("changes").upsert(changeToRow(c));
}

export async function saveNotification(n: Notification) {
  const sb = supabase();
  if (!sb) return;
  await sb.from("notifications").upsert(notifToRow(n));
}

// --- Mapeos fila <-> objeto --------------------------------------------------
const rowToChange = (r: any): Change => ({
  id: r.id, sourceId: r.source_id, severidad: r.severidad, titulo: r.titulo,
  vigencia: r.vigencia, quePaso: r.que_paso, queSignifica: r.que_significa,
  queHacer: r.que_hacer, productos: r.productos, diff: r.diff,
  detectadoEn: r.detectado_en, analisis: r.analisis, atendido: r.atendido,
});
const changeToRow = (c: Change) => ({
  id: c.id, source_id: c.sourceId, severidad: c.severidad, titulo: c.titulo,
  vigencia: c.vigencia, que_paso: c.quePaso, que_significa: c.queSignifica,
  que_hacer: c.queHacer, productos: c.productos, diff: c.diff,
  detectado_en: c.detectadoEn, analisis: c.analisis, atendido: c.atendido ?? false,
});
const rowToNotif = (r: any): Notification => ({
  id: r.id, sourceId: r.source_id, tone: r.tone, titulo: r.titulo,
  detalle: r.detalle, cuando: r.cuando, leido: r.leido,
});
const notifToRow = (n: Notification) => ({
  id: n.id, source_id: n.sourceId, tone: n.tone, titulo: n.titulo,
  detalle: n.detalle, cuando: n.cuando, leido: n.leido,
});
