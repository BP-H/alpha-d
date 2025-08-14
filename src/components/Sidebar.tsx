// src/components/Sidebar.tsx
import React, { useEffect, useMemo, useState } from "react";
import "./Sidebar.css";
import bus from "../lib/bus";

type Species = "human" | "company" | "ai";
type DecisionKind = "standard" | "important";

function useLocal<T>(k: string, init: T){
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) as T : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, [k, v]);
  return [v, setV] as const;
}

export default function Sidebar(){
  const [open, setOpen] = useLocal("sn.sidebarOpen", false);
  useEffect(() => {
    const o1 = bus.on("sidebar:toggle", () => setOpen(v => !v));
    const o2 = bus.on("sidebar:open", () => setOpen(true));
    const o3 = bus.on("sidebar:close", () => setOpen(false));
    return () => { o1?.(); o2?.(); o3?.(); };
  }, []);

  const [species, setSpecies] = useLocal<Species>("sn.species", "human");
  const [decisionKind, setKind] = useLocal<DecisionKind>("sn.decisionKind", "standard");
  const [query, setQuery] = useLocal("sn.search", "");
  const [useReal, setUseReal] = useLocal("sn.useReal", false);
  const [backendUrl, setBackend] = useLocal("sn.backendUrl", "http://127.0.0.1:8000");
  const [apiKey, setKey] = useLocal("sn.apiKey", "");
  const [showKey, setShowKey] = useState(false);

  const viewers = useMemo(() => 2862, []);
  const impressions = useMemo(() => 1442, []);

  useEffect(() => { bus.emit("identity:update", { species, decisionKind }); }, [species, decisionKind]);
  useEffect(() => { bus.emit("backend:update", { useReal, backendUrl }); }, [useReal, backendUrl]);
  useEffect(() => { bus.emit("search:prime", { query }); }, [query]);

  return (
    <>
      {open && <div className="snv2-scrim" onClick={() => setOpen(false)} aria-label="Close sidebar" />}
      <aside className={`snv2 ${open ? "open" : "fab"}`}>
        {!open && (
          <button className="snv2-fab" onClick={() => setOpen(true)} aria-label="Open menu">
            <img src="/avatar.jpg" alt="me" width={56} height={56} />
          </button>
        )}
        {open && (
          <div className="snv2-panel" role="dialog" aria-modal="true">
            <div className="snv2-panel__head">
              <button className="snv2-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
              <div className="snv2-brand"><span className="orb"/><span className="text">superNova_2177</span></div>
            </div>

            <div className="section">Identity</div>
            <label className="label">I am a…</label>
            <select className="input" value={species} onChange={e => setSpecies(e.target.value as Species)}>
              <option value="human">human</option><option value="company">company</option><option value="ai">ai</option>
            </select>

            <label className="label">Decision kind</label>
            <select className="input" value={decisionKind} onChange={e => setKind(e.target.value as DecisionKind)}>
              <option value="standard">standard (60% yes)</option><option value="important">important (90% yes)</option>
            </select>

            <div className="section">Search</div>
            <input className="input" placeholder="🔍 seed query…" value={query} onChange={e => setQuery(e.target.value)} />

            <div className="section">API</div>
            <div className="api">
              <input className="input" placeholder="OpenAI API key" type={showKey ? "text":"password"} value={apiKey} onChange={e => setKey(e.target.value)} />
              <button className="icon" onClick={() => setShowKey(s => !s)} aria-label="Toggle">{showKey ? "🙈":"👁"}</button>
              <button className="icon danger" onClick={() => setKey("")} aria-label="Clear">✕</button>
            </div>

            <div className="section">Backend</div>
            <label className="toggle">
              <input type="checkbox" checked={useReal as boolean} onChange={e => setUseReal(e.target.checked)} />
              <span>Use real backend</span>
            </label>
            <input className="input" placeholder="http://127.0.0.1:8000" value={backendUrl} onChange={e => setBackend(e.target.value)} />

            <div className="divider"/>
            <div className="section">Navigate</div>
            <button className="btn" onClick={() => bus.emit("nav:goto", { label: "Feed" })}>🏡 <span>Feed</span></button>
            <button className="btn" onClick={() => bus.emit("nav:goto", { label: "Chat" })}>💬 <span>Chat</span></button>
            <button className="btn" onClick={() => bus.emit("nav:goto", { label: "Metaverse" })}>🌌 <span>Enter Metaverse</span></button>

            <div className="divider"/>
            <button className="btn">⚙️ <span>Settings</span></button>

            <div className="caption" style={{ marginTop:8 }}>
              The top‑left logo will become a 3D avatar. Clicking it already runs a portal animation.
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
