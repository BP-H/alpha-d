// src/components/Sidebar.tsx
import React, { useEffect, useState } from "react";
import "./Sidebar.css";
import bus from "../lib/bus";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const a = bus.on("sidebar:toggle", () => setOpen((v) => !v));
    const b = bus.on("sidebar:open", () => setOpen(true));
    const c = bus.on("sidebar:close", () => setOpen(false));
    return () => {
      a?.();
      b?.();
      c?.();
    };
  }, []);

  return (
    <>
      {open && <div className="snv2-scrim" onClick={() => setOpen(false)} aria-label="Close sidebar" />}
      <aside className={`snv2 ${open ? "open" : "fab"}`} aria-hidden={!open}>
        {!open && (
          <button className="snv2-fab" onClick={() => setOpen(true)} aria-label="Open menu">
            <span className="snv2-fab-core" />
          </button>
        )}
        {open && (
          <div className="snv2-panel" role="dialog" aria-modal="true">
            <div className="snv2-panel__head">
              <div className="snv2-brand">
                <span className="orb" />
                <span className="text">superNova_2177</span>
              </div>
              <button className="snv2-close" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="section">Navigate</div>
            <button className="btn" onClick={() => bus.emit("nav:goto", { label: "Feed" })}>
              🏡 <span>Feed</span>
            </button>
            <button
              className="btn"
              onClick={() => bus.emit("orb:portal", { x: 28, y: 28 })}
              title="Fire portal"
            >
              🌌 <span>Enter Metaverse</span>
            </button>

            <div className="divider" />

            <div className="caption">
              Orb holds search + chat.
              <br />
              Tip: hold to talk, release to stop.
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
