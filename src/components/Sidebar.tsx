// src/components/Sidebar.tsx
import React, { useEffect, useState } from "react";
import "./Sidebar.css";
import bus from "../lib/bus";
import IntegrationSettings from "./IntegrationSettings";

type Keys = {
  openai?: string;
  anthropic?: string;
  perplexity?: string;
  stability?: string;
  elevenlabs?: string;
};

function useLocal<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV] as const;
}

export default function Sidebar() {
  const [open, setOpen] = useLocal("sn.sidebar.open", false);

  useEffect(() => {
    const a = bus.on("sidebar:toggle", () => setOpen(v => !v));
    const b = bus.on("sidebar:open",   () => setOpen(true));
    const c = bus.on("sidebar:close",  () => setOpen(false));
    return () => { a?.(); b?.(); c?.(); };
  }, [setOpen]);

  // Profile
  const [name, setName] = useLocal("sn.profile.name", "Your Name");
  const [handle, setHandle] = useLocal("sn.profile.handle", "@you");
  const [bio, setBio] = useLocal("sn.profile.bio", "I bend worlds with orbs and postcards.");
  const [avatar, setAvatar] = useLocal("sn.profile.avatar", "/avatar.jpg");

  // Theme / Accent / World controls
  const [theme, setTheme] = useLocal<"dark"|"light">("sn.theme", "dark");
  const [accent, setAccent] = useLocal("sn.accent", "#7c83ff");
  const [worldMode, setWorldMode] = useLocal<"orbs"|"matrix">("sn.world.mode", "orbs");
  const [orbCount, setOrbCount] = useLocal("sn.world.count", 64);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.dataset.theme = theme;
  }, [accent, theme]);

  // API keys vault
  const [keys, setKeys] = useLocal<Keys>("sn.keys", {});
  const [showKey, setShowKey] = useState<string | null>(null);

  const setKey = (k: keyof Keys, v: string) => setKeys({ ...keys, [k]: v });
  const clearAll = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith("sn."))
      .forEach(k => localStorage.removeItem(k));
    location.reload();
  };

  return (
    <>
      {open && <div className="sb-scrim" onClick={() => setOpen(false)} aria-label="Close sidebar" />}
      <aside className={`sb ${open ? "open" : "fab"}`}>
        {!open && (
          <button className="sb-fab" onClick={() => setOpen(true)} aria-label="Open menu">
            <img src={avatar} width={56} height={56} alt="me" />
          </button>
        )}

        {open && (
          <div className="sb-panel" role="dialog" aria-modal="true">
            {/* Header */}
            <div className="sb-head">
              <button className="sb-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
              <div className="sb-brand">
                <span className="sb-orb" />
                <span className="sb-logo">superNova_2177</span>
              </div>
            </div>

            {/* Profile card */}
            <section className="card profile">
              <div className="cover" />
              <div className="row">
                <div className="ava"><img src={avatar} alt="avatar" /></div>
                <div className="meta">
                  <input className="inline h1" value={name} onChange={e => setName(e.target.value)} />
                  <input className="inline handle" value={handle} onChange={e => setHandle(e.target.value)} />
                </div>
              </div>
              <textarea className="bio" rows={2} value={bio} onChange={e => setBio(e.target.value)} />
              <div className="bar">
                <button className="pill" onClick={() => bus.emit("nav:goto", { label: "Feed" })}>🏡 Feed</button>
                <button className="pill" onClick={() => bus.emit("orb:portal", { x: 120, y: 80 })}>🌀 Portal</button>
                <label className="pill file">
                  <input type="file" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = URL.createObjectURL(f); setAvatar(url);
                  }} />
                  Change avatar
                </label>
              </div>
            </section>

            {/* Settings */}
            <section className="card">
              <header>Appearance</header>
              <div className="grid two">
                <div>
                  <label className="label">Theme</label>
                  <select className="input" value={theme} onChange={e => setTheme(e.target.value as any)}>
                    <option value="dark">Dark</option><option value="light">Light</option>
                  </select>
                </div>
                <div>
                  <label className="label">Accent</label>
                  <div className="swatches">
                    {["#7c83ff","#ff74de","#00ffa2","#9efcff","#ffd166"].map(c =>
                      <button key={c} className={`sw ${c===accent?"on":""}`} style={{ background:c }} onClick={() => setAccent(c)} aria-label={c} />
                    )}
                    <input className="input" value={accent} onChange={e => setAccent(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid two">
                <div>
                  <label className="label">Background</label>
                  <select className="input" value={worldMode} onChange={e => setWorldMode(e.target.value as any)}>
                    <option value="orbs">Orb Mesh</option>
                    <option value="matrix">Matrix Drift</option>
                  </select>
                </div>
                <div>
                  <label className="label">Orb density</label>
                  <input className="input" type="range" min={16} max={160} step={4} value={orbCount} onChange={e => setOrbCount(parseInt(e.target.value, 10))} />
                </div>
              </div>
              <p className="hint">Changes apply instantly and persist on this device.</p>
            </section>

            {/* Keys */}
            <section className="card">
              <header>API Keys Vault</header>
              {([
                ["OpenAI", "openai"],
                ["Anthropic", "anthropic"],
                ["Perplexity", "perplexity"],
                ["Stability", "stability"],
                ["ElevenLabs", "elevenlabs"],
              ] as const).map(([label, keyName]) => (
                <div className="row key" key={keyName}>
                  <div className="klabel">{label}</div>
                  <input
                    className="input mono"
                    type={showKey === keyName ? "text" : "password"}
                    placeholder={`${label} API key`}
                    value={(keys as any)[keyName] || ""}
                    onChange={e => setKey(keyName as keyof Keys, e.target.value)}
                  />
                  <button className="icon" onClick={() => setShowKey(s => s === keyName ? null : keyName)}>{showKey === keyName ? "🙈" : "👁"}</button>
                  <button className="icon danger" onClick={() => setKey(keyName as keyof Keys, "")}>✕</button>
                </div>
              ))}
              <p className="hint">Keys are stored locally only (browser <code>localStorage</code>).</p>
            </section>

            <IntegrationSettings />

            {/* Privacy */}
            <section className="card">
              <header>Privacy & Data</header>
              <div className="row">
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span>Keep chat on this device only</span>
                </label>
              </div>
              <div className="row">
                <label className="toggle">
                  <input type="checkbox" />
                  <span>Hide personal details in screenshots</span>
                </label>
              </div>
            </section>

            {/* Danger */}
            <section className="card danger">
              <header>Danger Zone</header>
              <button className="btn danger" onClick={clearAll}>🧨 Wipe local data</button>
            </section>

            <footer className="sb-foot">made with ✨</footer>
          </div>
        )}
      </aside>
    </>
  );
}
