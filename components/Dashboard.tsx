"use client";

import { useState, useEffect } from "react";
import { RadarState, Change, Notification, SourceView } from "@/lib/types";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFecha(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
const estadoLabel: Record<string, string> = { activo: "Activo", atendido: "Atendido", archivado: "Archivado" };

export default function Dashboard({ initial }: { initial: RadarState }) {
  const [sources, setSources] = useState<SourceView[]>(initial.sources);
  const [changes, setChanges] = useState<Change[]>(initial.changes);
  const [notifs, setNotifs] = useState<Notification[]>(initial.notifications);
  const [view, setView] = useState<"vigente" | "temprana">("vigente");
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; icon: string; tone: string }[]>([]);
  const [lastCheck, setLastCheck] = useState("hace unos minutos");
  const [onboarding, setOnboarding] = useState(true);

  const activo = (c: Change) => (c.estadoCambio ?? "activo") === "activo";
  const changesOf = (sid: string) => changes.filter((c) => c.sourceId === sid).sort((a, b) => (a.detectadoEn < b.detectadoEn ? 1 : -1));
  const activeOf = (sid: string) => changesOf(sid).find(activo);

  // En "temprana" mostramos TODOS los países; los que no tienen señal real van "por implementar" (gris).
  const shownSources = view === "temprana" ? sources.slice() : sources.filter((s) => s.capa !== "temprana");
  const esPorImplementar = (s: SourceView) => view === "temprana" && s.capa !== "temprana";
  const activeCountry: SourceView | null = shownSources.find((s) => s.id === selected) || shownSources[0] || null;

  let cAlert = 0, cOk = 0;
  shownSources.forEach((s) => (s.estado === "cambio" ? cAlert++ : cOk++));
  const vigenteCount = sources.filter((s) => s.capa !== "temprana").length;
  const tempranaCount = sources.filter((s) => s.capa === "temprana").length;
  const unread = notifs.filter((n) => !n.leido).length;

  function toast(msg: string, icon = "", tone = "alert") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, icon, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }
  function applyState(st: RadarState) {
    setSources(st.sources); setChanges(st.changes); setNotifs(st.notifications);
  }

  async function runScan() {
    if (scanning) return;
    setScanning(true);
    try {
      const r = await fetch("/api/scan");
      const data = await r.json();
      if (data.state) applyState(data.state);
      setLastCheck("hace unos segundos");
      const n = data.detectados?.length || 0;
      if (n > 0) toast(`Leí las fuentes en vivo · ${n} cambio${n === 1 ? "" : "s"} detectado${n === 1 ? "" : "s"}`, "🔴");
      else toast("Leí las fuentes oficiales en vivo. Todo al día.", "✓", "ok");
    } catch { toast("No se pudo completar la revisión.", "⚠️"); }
    setScanning(false);
  }

  async function doAction(accion: string, opts: { id?: string; sourceId?: string }) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion, ...opts }) });
      const data = await r.json();
      if (data.state) applyState(data.state);
      const msgs: Record<string, string> = { atender: "Marcado como atendido", archivar: "Archivado", reabrir: "Reabierto", eliminar: "Eliminado", simular: "Detección simulada creada" };
      toast(msgs[accion] || "Listo", accion === "simular" ? "🔴" : "✓", accion === "simular" ? "alert" : "ok");
    } catch { toast("No se pudo completar la acción.", "⚠️"); }
    setBusy(false);
    setConfirmDel(null);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNotifOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <>
      <div className="stars"><i /><i /><i /></div>
      {scanning && <div className="scan-sweep" />}

      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src="/logo.svg" alt="Alegra" style={{ height: 28 }} />
            <div>
              <div className="brand-name">Regulation Radar</div>
              <div className="brand-sub">Product Regulation · Alegra</div>
            </div>
          </div>
          <div className="top-actions">
            <div className="pill-live"><span className="dot" />Sistema activo</div>
            <button className="icon-btn" aria-label="Notificaciones" onClick={(e) => { e.stopPropagation(); setNotifOpen((v) => !v); }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              {unread > 0 && <span className="badge">{unread}</span>}
            </button>
            <button className={"btn btn-primary" + (scanning ? " scanning" : "")} onClick={runScan} title="Revisa las fuentes oficiales ahora mismo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
              <span className="lbl">{scanning ? "Escaneando…" : "Revisar ahora"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="intro">
          <h1>El radar de tu equipo</h1>
          <p>Vigilamos a las entidades fiscales de cada país donde opera Alegra y te avisamos apenas la norma cambia. Elige un país a la izquierda para ver sus cambios.</p>
        </div>

        {onboarding && (
          <div className="onboard">
            <span style={{ fontSize: 20, lineHeight: 1 }}>👋</span>
            <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>
              <b>Bienvenida.</b> Arriba eliges la capa: <b>Vigente / Por implementar</b> (ya obligatorio) o <b>En el radar / Señales tempranas</b> (aún no es ley). En la lista de la izquierda eliges el <b>país</b>, y a la derecha ves sus cambios: haz clic en uno para ver el detalle, el documento oficial y gestionarlo.
            </div>
            <button onClick={() => setOnboarding(false)} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontWeight: 700, fontSize: 12, color: "var(--muted)" }}>Entendido</button>
          </div>
        )}

        {/* Tabs de capa */}
        <div className="viewtabs">
          <button className={"viewtab" + (view === "vigente" ? " active" : "")} onClick={() => { setView("vigente"); setSelected(null); setExpandedId(null); }}>
            <span className="vt-icon">🔴</span>
            <span className="vt-txt"><b>Vigente / Por implementar</b><span>Cambios ya obligatorios · {vigenteCount}</span></span>
          </button>
          <button className={"viewtab" + (view === "temprana" ? " active" : "")} onClick={() => { setView("temprana"); setSelected(null); setExpandedId(null); }}>
            <span className="vt-icon">🌊</span>
            <span className="vt-txt"><b>En el radar / Señales tempranas</b><span>Proyectos y propuestas · {tempranaCount}</span></span>
          </button>
        </div>

        <div className="view-desc">
          {view === "vigente"
            ? "🔴 Cambios normativos ya publicados y obligatorios por las entidades oficiales. Requieren acción de Producto."
            : "🌊 Proyectos de decreto, propuestas y normativa en discusión que aún no es obligación. Se vigilan para anticiparse."}
        </div>

        <div className="statusline">
          <span>Última revisión <b>{lastCheck}</b></span><span className="sep" />
          <span><b>{sources.length}</b> fuentes activas</span><span className="sep" />
          <span className="mono" style={{ color: "var(--faint)" }}>modo: {initial.meta.modo === "supabase" ? "en vivo" : "demo"}</span>
          <span className="sep" />
          <span className="chip alert" style={{ padding: "3px 10px" }}><span className="sw" />{cAlert} con cambios</span>
          <span className="chip ok" style={{ padding: "3px 10px" }}><span className="sw" />{cOk} en orden</span>
          <button className="link-btn" onClick={() => setHealthOpen((v) => !v)}>{healthOpen ? "Ocultar estado de fuentes" : "Ver estado de fuentes"}</button>
        </div>

        {healthOpen && (
          <div className="health open">
            {shownSources.map((s) => (
              <div className="health-item" key={s.id}>
                <span className="h-dot" />
                <span className="h-src">{s.bandera} {s.fuenteNombre}</span>
                <span className="h-meta mono">revisada {s.ultimaRevision} · OK</span>
              </div>
            ))}
          </div>
        )}

        {/* Navegación: lista de países (izq) + detalle (der) */}
        <div className="nav-layout">
          <aside className="country-list">
            <div className="cl-head">Países ({shownSources.length})</div>
            {shownSources.map((s) => {
              const porImpl = esPorImplementar(s);
              const isAlert = !porImpl && s.estado === "cambio";
              const hist = changesOf(s.id).length;
              return (
                <button key={s.id} className={"country-row" + (activeCountry?.id === s.id ? " active" : "") + (porImpl ? " muted" : "")} onClick={() => { setSelected(s.id); setExpandedId(activeOf(s.id)?.id || null); }}>
                  <span className="cr-flag">{s.bandera}</span>
                  <span className="cr-txt">
                    <span className="cr-country">{s.pais}</span>
                    <span className="cr-entity">{porImpl ? "Por implementar" : s.entidad}</span>
                  </span>
                  {porImpl ? <span className="cr-soon">pronto</span> : <><span className={"cr-dot " + (isAlert ? "alert" : "ok")} title={isAlert ? "Algo cambió" : "En orden"} />{hist > 0 && <span className="cr-count">{hist}</span>}</>}
                </button>
              );
            })}
          </aside>

          <section className="detail-pane">
            {!activeCountry ? (
              <div className="qblock"><h3>◇ Sin fuentes en esta vista</h3><p>No hay fuentes configuradas en esta categoría por ahora.</p></div>
            ) : esPorImplementar(activeCountry) ? (
              <>
                <div className="detail-head">
                  <span className="flag" style={{ fontSize: 26, opacity: 0.6 }}>{activeCountry.bandera}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{activeCountry.pais}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Señales tempranas · {activeCountry.entidad}</div>
                  </div>
                  <span className="state" style={{ background: "var(--bg)", color: "var(--faint)" }}><span className="dot" style={{ background: "var(--faint)" }} />Por implementar</span>
                </div>
                <div style={{ background: "var(--bg)", border: "1px dashed var(--line)", borderRadius: 14, padding: "26px 22px", textAlign: "center", marginTop: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.5 }}>🌊</div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Monitoreo de señales tempranas por implementar</div>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, maxWidth: 440, margin: "0 auto" }}>
                    Aquí vigilaremos los <b>proyectos de decreto y propuestas normativas</b> de {activeCountry.pais} <b>antes</b> de que sean obligación, para que Alegra se anticipe. Esta capa está en el roadmap: se activará conectando las fuentes de anticipación (diarios oficiales, proyectos en consulta) de cada país.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="detail-head">
                  <span className="flag" style={{ fontSize: 26 }}>{activeCountry.bandera}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{activeCountry.pais}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{activeCountry.fuenteNombre}</div>
                  </div>
                  <span className={"state " + (activeCountry.estado === "cambio" ? "alert" : "ok")}><span className="dot" />{activeCountry.estado === "cambio" ? "Algo cambió" : "Todo en orden"}</span>
                </div>

                <div style={{ display: "flex", gap: 8, margin: "12px 0 16px", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" disabled={busy} onClick={() => doAction("simular", { sourceId: activeCountry.id })} title="Crea una detección de ejemplo">
                    {busy ? "Simulando…" : "＋ Simular detección"}<span style={{ fontSize: 10, fontWeight: 800, background: "rgba(0,0,0,.12)", borderRadius: 5, padding: "1px 5px", marginLeft: 4 }}>DEMO</span>
                  </button>
                  <a className="btn btn-ghost" href={activeCountry.fuenteUrl} target="_blank" rel="noopener">Abrir fuente oficial ↗</a>
                </div>

                {changesOf(activeCountry.id).length === 0 ? (
                  <div className="qblock"><h3>◇ Sin cambios registrados</h3><p>El radar está vigilando {activeCountry.fuenteNombre}. Cuando detecte un cambio, aparecerá aquí. Puedes usar «Simular detección» para ver cómo se vería.</p></div>
                ) : (
                  <div style={{ position: "relative", paddingLeft: 22 }}>
                    <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 2, background: "var(--line)" }} />
                    {changesOf(activeCountry.id).map((c) => {
                      const est = c.estadoCambio ?? "activo";
                      const dotColor = est === "atendido" ? "var(--ok)" : est === "archivado" ? "var(--faint)" : "var(--alert)";
                      const open = expandedId === c.id;
                      return (
                        <div key={c.id} style={{ position: "relative", marginBottom: 14, opacity: est === "archivado" ? 0.7 : 1 }}>
                          <div style={{ position: "absolute", left: -22, top: 5, width: 12, height: 12, borderRadius: "50%", background: dotColor, border: "2px solid #fff", boxShadow: "0 0 0 2px var(--line)" }} />
                          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                            <div onClick={() => setExpandedId(open ? null : c.id)} style={{ padding: "12px 14px", cursor: "pointer" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                                <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{fmtFecha(c.detectadoEn)}</span>
                                <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, color: dotColor, background: est === "atendido" ? "var(--ok-bg)" : est === "archivado" ? "var(--bg)" : "var(--alert-bg)" }}>{estadoLabel[est]}</span>
                                {c.simulacion && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 5, padding: "1px 6px" }}>simulación</span>}
                                <span style={{ marginLeft: "auto", color: "var(--faint)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{c.titulo}</div>
                              <div className="ptags" style={{ marginTop: 7 }}>{c.productos.map((p) => <span className="ptag" key={p}>{p}</span>)}</div>
                            </div>
                            {open && <ChangeBody c={c} source={activeCountry} busy={busy} confirmDel={confirmDel} setConfirmDel={setConfirmDel} doAction={doAction} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <p className="footnote">
        <b>Fuentes oficiales.</b> El radar solo se conecta a entidades oficiales (SAT, DIAN, MinHacienda, SUNAT, DGII, Hacienda, DGI, SENIAT, ARCA, AEAT). Lee las fuentes en vivo y corre automático por Vercel Cron; «Revisar ahora» es opcional. Casos reales verificables: SAT (México · CFDI 4.0) y DIAN (Colombia · Buscar documento).
      </p>

      {notifOpen && <div onClick={() => setNotifOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}
      <div className={"notif" + (notifOpen ? " open" : "")} style={{ zIndex: 50 }} onClick={(e) => e.stopPropagation()}>
        <div className="notif-head">Notificaciones <button onClick={() => setNotifs((n) => n.map((x) => ({ ...x, leido: true })))}>Marcar todo leído</button></div>
        <div className="notif-list">
          {notifs.length === 0 ? (
            <div className="notif-empty">Sin novedades. Todo tranquilo por aquí.</div>
          ) : notifs.map((n) => (
            <div className="notif-item" key={n.id} onClick={() => { setNotifOpen(false); const s = sources.find((x) => x.id === n.sourceId); if (s) { setView(s.capa === "temprana" ? "temprana" : "vigente"); setSelected(n.sourceId); } }}>
              <span className={"notif-dot " + n.tone} />
              <div><div className="t">{n.titulo}</div><div className="d">{n.detalle}</div><div className="ago mono">{n.cuando}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span className="t-dot" style={{ background: t.tone === "ok" ? "var(--ok)" : "var(--alert)" }} />
            <span>{t.icon ? t.icon + " " : ""}{t.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ChangeBody({ c, source: s, busy, confirmDel, setConfirmDel, doAction }: any) {
  const est = c.estadoCambio ?? "activo";
  return (
    <div style={{ borderTop: "1px solid var(--line)", padding: "4px 14px 14px" }}>
      <div style={{ background: "var(--ok-bg)", border: "1px solid #bfeee4", borderRadius: 12, padding: "12px 14px", marginTop: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--action-dark)", marginBottom: 6 }}>📄 Documento oficial</div>
        {c.documentoNombre && <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.4, marginBottom: 3 }}>{c.documentoNombre}</div>}
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 9 }}>
          {[c.documentoTipo, c.documentoNumero].filter(Boolean).join(" · ")}{c.vigencia ? ` · ${c.vigencia}` : ""}
        </div>
        <a href={c.documentoUrl || s.fuenteUrl} target="_blank" rel="noopener" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          Abrir documento oficial en {s.entidad.split(" ")[0]} ↗
        </a>
        {c.linkDirecto === false && (
          <div className="note" style={{ marginTop: 7 }}>Enlace directo al documento no disponible; abre la página oficial de la {s.entidad.split(" ")[0]} donde se localiza. Referencia: {c.documentoNumero || "comunicado oficial"}.</div>
        )}
      </div>

      <div className="qblock"><h3>① Qué cambió</h3><p>{c.quePaso}</p></div>

      {c.antes && c.despues && (
        <div className="qblock">
          <h3>◈ Antes → Después</h3>
          <div className="ba-grid">
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 4 }}>Antes · {c.antes.etiqueta}</div>
              <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--muted)" }}>{c.antes.texto}</p>
            </div>
            <div style={{ background: "var(--ok-bg)", border: "1px solid #bfeee4", borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--action-dark)", marginBottom: 4 }}>Después · {c.despues.etiqueta}</div>
              <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink)" }}>{c.despues.texto}</p>
            </div>
          </div>
        </div>
      )}
      {c.diff && (
        <pre style={{ marginTop: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.5, background: "#0B2B26", color: "#CFF7ED", padding: "11px 13px", borderRadius: 10, whiteSpace: "pre-wrap", overflowX: "auto" }}>{c.diff}</pre>
      )}

      <div className="qblock"><h3>② Qué significa para nuestros usuarios</h3><p>{c.queSignifica}</p></div>
      <div className="qblock do"><h3>③ Qué tiene que hacer Producto</h3>
        <ul className="checklist">{c.queHacer.map((x: string, i: number) => <li key={i}><span className="box">✓</span><span>{x}</span></li>)}</ul>
      </div>

      <details className="acc"><summary><span>Documento técnico</span><span className="lbl">RIA · RRD · GAP</span><span className="chev">▾</span></summary>
        <div className="acc-body">
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".05em", color: "var(--action-dark)", margin: "6px 0 4px" }}>EVALUACIÓN DE IMPACTO (RIA)</div>
          {c.analisis.ria.map((r: string[], i: number) => <div className="doc-row" key={i}><b>{r[0]}</b>{r[1]}</div>)}
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".05em", color: "var(--action-dark)", margin: "16px 0 4px" }}>REQUERIMIENTOS (RRD)</div>
          {c.analisis.rrd.map((r: string[], i: number) => <div className="doc-req" key={i}><span className="rid">{r[0]}</span><span>{r[1]}</span></div>)}
          <div className="note">{c.analisis.rrdAccept}</div>
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".05em", color: "var(--action-dark)", margin: "16px 0 6px" }}>GAP ANALYSIS</div>
          <div className="gap-row">
            <div className="gap-cell"><b>Estado actual</b><p>{c.analisis.gap.actual}</p></div>
            <div className="gap-cell"><b>Estado requerido</b><p>{c.analisis.gap.requerido}</p></div>
          </div>
          <div className="gap-cell" style={{ marginBottom: 10 }}><b>Brecha</b><p>{c.analisis.gap.brecha}</p></div>
          <div className="gap-row">
            <div className="gap-cell"><b>Esfuerzo estimado</b><p>{c.analisis.gap.esfuerzo}</p></div>
            <div className="gap-cell"><b>Prioridad</b><p>{c.analisis.gap.prioridad}</p></div>
          </div>
          <div className="note">Estimaciones a validar con Ingeniería y Producto.</div>
        </div>
      </details>

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8 }}>¿Qué quieres hacer con este cambio?</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {est === "activo" && <button className="btn btn-primary" disabled={busy} onClick={() => doAction("atender", { id: c.id })}>✓ Marcar atendido</button>}
          {est !== "activo" && <button className="btn btn-ghost" disabled={busy} onClick={() => doAction("reabrir", { id: c.id })}>↺ Reabrir</button>}
          {est !== "archivado" && <button className="btn btn-ghost" disabled={busy} onClick={() => doAction("archivar", { id: c.id })}>🗄 Archivar</button>}
          {confirmDel === c.id ? (
            <>
              <span style={{ fontSize: 12.5, color: "var(--alert)", fontWeight: 700, alignSelf: "center" }}>¿Seguro?</span>
              <button className="btn" style={{ background: "var(--alert)", color: "#fff" }} disabled={busy} onClick={() => doAction("eliminar", { id: c.id })}>Sí, eliminar</button>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
            </>
          ) : (
            <button className="btn btn-ghost" style={{ color: "var(--alert)", borderColor: "#f5b7b0" }} onClick={() => setConfirmDel(c.id)}>🗑 Eliminar</button>
          )}
        </div>
      </div>
    </div>
  );
}
