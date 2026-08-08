import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SOURCES } from "./sources";
import { SEED_CHANGES, SEED_NOTIFICATIONS, SEED_OK_DESDE, SEED_SNAPSHOTS } from "./seed";
import { Change, Estado, Notification, RadarState, Snapshot, SourceView } from "./types";

// STORE — usa Supabase si está configurado; si no, cae al SEED en memoria.

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

let MEM_CHANGES: Change[] | null = null;
let MEM_NOTIFS: Notification[] | null = null;
function memChanges(): Change[] { if (!MEM_CHANGES) MEM_CHANGES = SEED_CHANGES.map((c) => ({ ...c })); return MEM_CHANGES; }
function memNotifs(): Notification[] { if (!MEM_NOTIFS) MEM_NOTIFS = SEED_NOTIFICATIONS.map((n) => ({ ...n })); return MEM_NOTIFS; }

export async function getState(): Promise<RadarState> {
  const sb = supabase();
  let changes: Change[] = memChanges();
  let notifications: Notification[] = memNotifs();
  let snapshots: Snapshot[] = SEED_SNAPSHOTS;

  if (sb) {
    const [{ data: ch }, { data: nt }, { data: sn }] = await Promise.all([
      sb.from("changes").select("*").order("detectado_en", { ascending: false }),
      sb.from("notifications").select("*").order("creado_en", { ascending: false }),
      sb.from("snapshots").select("*"),
    ]);
    changes = (ch || []).map(rowToChange);
    notifications = (nt || []).map(rowToNotif);
    snapshots = (sn || []).map((r: any) => ({ sourceId: r.source_id, hash: r.hash, texto: r.texto, capturadoEn: r.capturado_en }));
    // Primera vez: sembramos la BD con los casos reales para que queden en el historial.
    if (!changes.length) {
      for (const c of SEED_CHANGES) { try { await sb.from("changes").upsert(changeToRow(c)); } catch {} }
      for (const n of SEED_NOTIFICATIONS) { try { await sb.from("notifications").upsert(notifToRow(n)); } catch {} }
      changes = SEED_CHANGES.map((c) => ({ ...c }));
      notifications = SEED_NOTIFICATIONS.map((n) => ({ ...n }));
    }
  }

  const activo = (c: Change) => (c.estadoCambio ?? "activo") === "activo";
  const changedIds = new Set(changes.filter(activo).map((c) => c.sourceId));
  const revealSeed = new Set(modo() === "seed" ? ["mx"] : []);

  const sources: SourceView[] = SOURCES.map((s) => {
    const estado: Estado = revealSeed.has(s.id) ? "base" : changedIds.has(s.id) ? "cambio" : "ok";
    const snap = snapshots.find((x) => x.sourceId === s.id);
    return {
      ...s,
      estado,
      ultimaRevision: "hace un momento",
      okDesde: SEED_OK_DESDE[s.id],
      textoExtraido: snap?.texto,
      fuenteCapturadaEn: snap?.capturadoEn,
      totalHistorial: changes.filter((c) => c.sourceId === s.id).length,
    };
  });

  return { sources, changes, notifications, meta: { ultimaRevision: new Date().toISOString(), proxima: "en ~12 h", modo: modo() } };
}

export async function getSnapshot(sourceId: string): Promise<Snapshot | null> {
  const sb = supabase();
  if (!sb) return SEED_SNAPSHOTS.find((s) => s.sourceId === sourceId) ?? null;
  const { data } = await sb.from("snapshots").select("*").eq("source_id", sourceId).single();
  return data ? { sourceId, hash: data.hash, texto: data.texto, capturadoEn: data.capturado_en } : null;
}
export async function saveSnapshot(snap: Snapshot) {
  const sb = supabase();
  if (!sb) return;
  await sb.from("snapshots").upsert({ source_id: snap.sourceId, hash: snap.hash, texto: snap.texto, capturado_en: snap.capturadoEn });
}
export async function saveChange(c: Change) {
  const sb = supabase();
  if (!sb) { const m = memChanges(); const i = m.findIndex((x) => x.id === c.id); if (i >= 0) m[i] = c; else m.unshift(c); return; }
  await sb.from("changes").upsert(changeToRow(c));
}
export async function saveNotification(n: Notification) {
  const sb = supabase();
  if (!sb) { memNotifs().unshift(n); return; }
  await sb.from("notifications").upsert(notifToRow(n));
}
export async function setEstadoCambio(id: string, estado: string) {
  const sb = supabase();
  if (!sb) { const c = memChanges().find((x) => x.id === id); if (c) c.estadoCambio = estado as any; return; }
  await sb.from("changes").update({ estado_cambio: estado }).eq("id", id);
}
export async function deleteChange(id: string) {
  const sb = supabase();
  if (!sb) { MEM_CHANGES = memChanges().filter((x) => x.id !== id); return; }
  await sb.from("changes").delete().eq("id", id);
}

const rowToChange = (r: any): Change => ({
  id: r.id, sourceId: r.source_id, severidad: r.severidad, titulo: r.titulo, vigencia: r.vigencia,
  quePaso: r.que_paso, queSignifica: r.que_significa, queHacer: r.que_hacer, productos: r.productos,
  antes: r.antes, despues: r.despues, diff: r.diff, detectadoEn: r.detectado_en, analisis: r.analisis,
  estadoCambio: r.estado_cambio ?? "activo", simulacion: r.simulacion ?? false,
});
const changeToRow = (c: Change) => ({
  id: c.id, source_id: c.sourceId, severidad: c.severidad, titulo: c.titulo, vigencia: c.vigencia,
  que_paso: c.quePaso, que_significa: c.queSignifica, que_hacer: c.queHacer, productos: c.productos,
  antes: c.antes, despues: c.despues, diff: c.diff, detectado_en: c.detectadoEn, analisis: c.analisis,
  estado_cambio: c.estadoCambio ?? "activo", simulacion: c.simulacion ?? false,
});
const rowToNotif = (r: any): Notification => ({ id: r.id, sourceId: r.source_id, tone: r.tone, titulo: r.titulo, detalle: r.detalle, cuando: r.cuando, leido: r.leido });
const notifToRow = (n: Notification) => ({ id: n.id, source_id: n.sourceId, tone: n.tone, titulo: n.titulo, detalle: n.detalle, cuando: n.cuando, leido: n.leido });
