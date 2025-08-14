// src/components/Sidebar.tsx (same as you had; minimal bus wiring)
import React, { useEffect, useState } from "react";
import bus from "../lib/bus";

export default function Sidebar(){
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const a = bus.on("sidebar:toggle", () => setOpen(v=>!v));
    const b = bus.on("sidebar:open", () => setOpen(true));
    const c = bus.on("sidebar:close", () => setOpen(false));
    return () => { a?.(); b?.(); c?.(); };
  }, []);
  return (
    <>
      {open && <div className="snv2-scrim" onClick={() => setOpen(false)} />}
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
            <div className="section">Navigate</div>
            <button className="btn" onClick={() => bus.emit("nav:goto", { label: "Feed" })}>🏡 <span>Feed</span></button>
            <button className="btn" onClick={() => bus.emit("nav:goto", { label: "Metaverse" })}>🌌 <span>Enter Metaverse</span></button>
            <div className="divider"/>
            <button className="btn">⚙️ <span>Settings</span></button>
          </div>
        )}
      </aside>
    </>
  );
}
