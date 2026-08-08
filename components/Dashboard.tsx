"use client";

import { useMemo, useState, useEffect } from "react";
import { RadarState, Change, Notification } from "@/lib/types";

const stateLabel: Record<string, string> = { cambio: "Algo cambió", base: "Por revisar", ok: "Todo en orden" };
const stateClass: Record<string, string> = { cambio: "alert", base: "warn", ok: "ok" };
const cardClass: Record<string, string> = { cambio: "is-alert", base: "is-warn", ok: "is-ok" };

export default function Dashboard({ initial }: { initial: RadarState }) {
  const [sources, setSources] = useState(initial.sources);
  const [changes, setChanges] = useState<Change[]>(initial.changes);
  const [notifs, setNotifs] = useState<Notification[]>(initial.notifications);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; icon: string; tone: string }[]>([]);
  const [lastCheck, setLastCheck] = useState("hace unos minutos");

  const changeBySource = (id: string) => changes.find((c) => c.sourceId === id && !c.atendido);
  const counts = useMemo(() => {
    let a = 0, w = 0, o = 0;
    sources.forEach((s) => (s.estado === "cambio" ? a++ : s.estado === "base" ? w++ : o++));
    return { a, w, o };
  }, [sources]);
  const unread = notifs.filter((n) => !n.leido).length;

  function toast(msg: string, icon = "", tone = "alert") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, icon, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }

  async function runScan() {
    if (scanning) return;
    setScanning(true);
    fetch("/api/scan").catch(() => {});
    setTimeout(() => {
      setScanning(false);
      setLastCheck("hace unos segundos");
      let revealed: string | null = null;
      setSources((prev) =>
        prev.map((s) => {
          if (s.estado === "base" && changeBySource(s.id)) {
            revealed = s.id;
            return { ...s, estado: "cambio", ultimaRevision: "hace un momento" };
          }
          return { ...s, ultimaRevision: "hace un momento" };
        })
      );
      if (revealed) {
        const c = changeBySource(revealed)!;
        const src = sources.find((s) => s.id === revealed)!;
        setNotifs((n) => [
          { id: "n-live-" + revealed, sourceId: revealed!, tone: "alert", titulo: `${src.pais} · ${src.entidad.split(" ")[0]}`, detalle: c.titulo, cuando: "ahora", leido: false },
          ...n,
        ]);
        toast(`Cambio detectado en ${src.pais} · ${src.entidad.split(" ")[0]}`, "🔴");
      } else {
        toast("Radar actualizado. Sin cambios nuevos.", "✓", "ok");
      }
    }, 1350);
  }

  function markAttended(id: string) {
    setChanges((cs) => cs.map((c) => (c.sourceId === id ? { ...c, atendido: true } : c)));
    setSources((ss) => ss.map((s) => (s.id === id ? { ...s, estado: "ok", okDesde: "hoy" } : s)));
    setNotifs((n) => n.filter((x) => x.sourceId !== id));
    setOpenId(null);
    const src = sources.find((s) => s.id === id);
    toast(`${src?.pais} marcado como atendido`, "✓", "ok");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenId(null); setNotifOpen(false); } };
    const onClick = () => setNotifOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, []);

  const openSource = openId ? sources.find((s) => s.id === openId) : null;
  const openChange = openId ? changeBySource(openId) : null;

  return (
    <>
      {scanning && <div className="scan-sweep" />}

      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-dot" />
            <div>
              <div className="brand-name">Alegra Regulation Radar</div>
              <div className="brand-sub">Product Regulation</div>
            </div>
          </div>
          <div className="top-actions">
            <div className="pill-live"><span className="dot" />Sistema activo</div>
            <button className="icon-btn" aria-label="Notificaciones" onClick={(e) => { e.stopPropagation(); setNotifOpen((v) => !v); }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              {unread > 0 && <span className="badge">{unread}</span>}
            </button>
            <button className={"btn btn-primary" + (scanning ? " scanning" : "")} onClick={runScan}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
              <span className="lbl">{scanning ? "Escaneando…" : "Revisar ahora"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="intro">
          <h1>El radar de tu equipo</h1>
          <p>Vigilamos a las entidades fiscales de cada país donde opera Alegra y te avisamos apenas la norma cambia. Sin que tengas que revisar una por una.</p>
        </div>

        <div className="statusline">
          <span>Última revisión <b>{lastCheck}</b></span><span className="sep" />
          <span>Próxima <b>{initial.meta.proxima}</b></span><span className="sep" />
          <span><b>{sources.length}</b> fuentes activas</span>
          <button className="link-btn" onClick={() => setHealthOpen((v) => !v)}>{healthOpen ? "Ocultar estado de fuentes" : "Ver estado de fuentes"}</button>
        </div>

        {healthOpen && (
          <div className="health open">
            {sources.map((s) => (
              <div className="health-item" key={s.id}>
                <span className="h-dot" />
                <span className="h-src">{s.bandera} {s.fuenteNombre}</span>
                <span className="h-meta mono">revisada {s.ultimaRevision} · OK</span>
              </div>
            ))}
          </div>
        )}

        <div className="chips">
          <div className="chip alert"><span className="sw" /><span className="n">{counts.a}</span> {counts.a === 1 ? "cambio nuevo" : "cambios nuevos"}</div>
          <div className="chip warn"><span className="sw" /><span className="n">{counts.w}</span> por revisar</div>
          <div className="chip ok"><span className="sw" /><span className="n">{counts.o}</span> en orden</div>
        </div>

        <div className="grid">
          {sources.map((s) => {
            const c = changeBySource(s.id);
            const headline = s.estado === "cambio" && c ? c.titulo
              : s.estado === "base" ? "Snapshot base listo. Revisa para comparar con la versión de hoy."
              : `Todo en orden. Sin cambios desde el ${s.okDesde}.`;
            const btnLabel = s.estado === "cambio" ? "Ver qué cambió" : s.estado === "base" ? "Ver detalle" : "Ver fuente";
            const btnClass = s.estado === "cambio" ? "btn-primary" : "btn-ghost";
            return (
              <div className={"card " + cardClass[s.estado]} key={s.id}>
                <div className="card-accent" />
                <div className="card-top">
                  <span className="flag">{s.bandera}</span>
                  <div><div className="card-country">{s.pais}</div><div className="card-entity">{s.entidad}</div></div>
                  <span className={"state " + stateClass[s.estado]}><span className="dot" />{stateLabel[s.estado]}</span>
                </div>
                <div className="card-headline">{headline}</div>
                {s.estado === "cambio" && c && (
                  <div className="ptags">{c.productos.map((p) => <span className="ptag" key={p}>{p}</span>)}</div>
                )}
                <div className="card-meta"><span className="mono">◔ {s.ultimaRevision}</span></div>
                <button className={"btn card-btn " + btnClass} onClick={() => (s.estado === "base" ? runScan() : setOpenId(s.id))}>{btnLabel}</button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="footnote">
        <b>Fuentes oficiales.</b> El radar solo se conecta a entidades oficiales (SAT, DIAN, SUNAT, DGII, Hacienda, DGI, SENIAT, ARCA, AEAT). Corre automático por Vercel Cron; el botón «Revisar ahora» es opcional. Casos con datos reales y verificables: SAT (México · CFDI 4.0, vigente 17-jul-2026) y DIAN (Colombia · Res. 000202 y 000227 de 2025).
      </p>

      <div className={"notif" + (notifOpen ? " open" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="notif-head">Notificaciones <button onClick={() => setNotifs((n) => n.map((x) => ({ ...x, leido: true })))}>Marcar todo leído</button></div>
        <div className="notif-list">
          {notifs.length === 0 ? (
            <div className="notif-empty">Sin novedades. Todo tranquilo por aquí.</div>
          ) : notifs.map((n) => (
            <div className="notif-item" key={n.id} onClick={() => { setNotifOpen(false); setOpenId(n.sourceId); }}>
              <span className={"notif-dot " + n.tone} />
              <div><div className="t">{n.titulo}</div><div className="d">{n.detalle}</div><div className="ago mono">{n.cuando}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className={"scrim" + (openId ? " open" : "")} onClick={() => setOpenId(null)} />
      <aside className={"panel" + (openId ? " open" : "")} aria-hidden={!openId}>
        {openSource && (
          <>
            <div className="panel-head">
              <span className="flag">{openSource.bandera}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{openSource.pais}</div>
                <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600 }}>{openSource.fuenteNombre}</div>
              </div>
              <button className="panel-close" aria-label="Cerrar" onClick={() => setOpenId(null)}>✕</button>
            </div>
            <div className="panel-body">
              {openChange ? (
                <ChangeDetail change={openChange} source={openSource} onAttend={() => markAttended(openSource.id)} onToast={toast} />
              ) : (
                <>
                  <div className="sev media" style={{ color: "var(--ok)", background: "var(--ok-bg)" }}>● Todo en orden</div>
                  <div className="panel-title">Sin cambios detectados</div>
                  <div className="panel-source">
                    <span className="tag">Última revisión: {openSource.ultimaRevision}</span>
                    {openSource.okDesde && <span className="tag">Sin cambios desde {openSource.okDesde}</span>}
                    <span className="tag"><a href={openSource.fuenteUrl} target="_blank" rel="noopener">Abrir fuente oficial ↗</a></span>
                  </div>
                  <div className="qblock"><h3>◇ Qué estamos vigilando</h3>
                    <p>Comparamos periódicamente la publicación oficial de {openSource.fuenteNombre}. Si algo cambia, te avisamos aquí y por Google Chat. Por ahora, nada nuevo.</p></div>
                </>
              )}
            </div>
          </>
        )}
      </aside>

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

function ChangeDetail({ change: c, source: s, onAttend, onToast }: { change: Change; source: any; onAttend: () => void; onToast: (m: string, i?: string, t?: string) => void }) {
  return (
    <>
      <span className={"sev " + c.severidad}>● Severidad {c.severidad}</span>
      <div className="panel-title">{c.titulo}</div>
      <div className="panel-source">
        <span className="tag mono">{c.vigencia}</span>
        <span className="tag">Fuente oficial · señal técnica</span>
        <span className="tag"><a href={s.fuenteUrl} target="_blank" rel="noopener">Ver en {s.entidad.split(" ")[0]} ↗</a></span>
      </div>

      <div className="qblock"><h3>◇ Productos afectados</h3>
        <div className="ptags">{c.productos.map((p) => <span className="ptag" key={p}>{p}</span>)}</div>
      </div>
      <div className="qblock"><h3>① Qué cambió</h3><p>{c.quePaso}</p></div>

      {c.antes && c.despues && (
        <div className="qblock">
          <h3>◈ Antes → Después</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 4 }}>Antes · {c.antes.etiqueta}</div>
              <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--muted)" }}>{c.antes.texto}</p>
            </div>
            <div style={{ background: "var(--ok-bg)", border: "1px solid #bfeee4", borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--action-dark)", marginBottom: 4 }}>Después · {c.despues.etiqueta}</div>
              <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink)" }}>{c.despues.texto}</p>
            </div>
          </div>
          {c.diff && (
            <pre style={{ marginTop: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.5, background: "#0B2B26", color: "#CFF7ED", padding: "11px 13px", borderRadius: 10, whiteSpace: "pre-wrap", overflowX: "auto" }}>{c.diff}</pre>
          )}
        </div>
      )}

      <div className="qblock"><h3>② Qué significa para nuestros usuarios</h3><p>{c.queSignifica}</p></div>
      <div className="qblock do"><h3>③ Qué tiene que hacer Producto</h3>
        <ul className="checklist">{c.queHacer.map((x, i) => <li key={i}><span className="box">✓</span><span>{x}</span></li>)}</ul>
      </div>

      <details className="acc"><summary><span>Documento técnico</span><span className="lbl">RIA · RRD · GAP</span><span className="chev">▾</span></summary>
        <div className="acc-body">
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".05em", color: "var(--action-dark)", margin: "6px 0 4px" }}>EVALUACIÓN DE IMPACTO (RIA)</div>
          {c.analisis.ria.map((r, i) => <div className="doc-row" key={i}><b>{r[0]}</b>{r[1]}</div>)}
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".05em", color: "var(--action-dark)", margin: "16px 0 4px" }}>REQUERIMIENTOS (RRD)</div>
          {c.analisis.rrd.map((r, i) => <div className="doc-req" key={i}><span className="rid">{r[0]}</span><span>{r[1]}</span></div>)}
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

      <details className="acc"><summary><span>Así se avisó al equipo</span><span className="lbl">GOOGLE CHAT · EMAIL</span><span className="chev">▾</span></summary>
        <div className="acc-body">
          <div className="gchat">
            <div className="gchat-head"><div className="gchat-av">R</div>
              <div className="gchat-name">Alegra Regulation Radar <span>· app · ahora</span></div></div>
            <div className="gchat-msg">
              <div className="m-title">🔴 {s.pais} · {s.entidad.split(" ")[0]}</div>
              {c.titulo}. <br />Qué implica: {c.queSignifica}
              <div><span className="gchat-btn">Abrir en el Radar ↗</span></div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="chan">✉️ Correo a Product Regulation <span className="ok-tick">✓ enviado</span></div>
            <div className="chan">💬 Google Chat · Product Regulation <span className="ok-tick">✓ enviado</span></div>
            <div className="chan">💬 Google Chat · squads de {c.productos.slice(0, 2).join(" y ")} <span className="ok-tick">✓ enviado</span></div>
          </div>
        </div>
      </details>

      <div className="panel-actions">
        <button className="btn btn-primary" onClick={() => onToast("Enviado a Producto", "✓", "ok")}>Enviar a Producto</button>
        <button className="btn btn-ghost" onClick={onAttend}>Marcar como atendido</button>
      </div>
    </>
  );
}
