import React, { useLayoutEffect, useRef } from "react";
import bus from "../lib/bus";

export default function Topbar() {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const setH = () => 
      document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`);
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header 
      ref={ref} 
      className="topbar" 
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
        height: 56, display: "grid", gridTemplateColumns: "auto 1fr auto",
        gap: 12, alignItems: "center", padding: "8px 12px",
        background: "var(--glass)", backdropFilter: "blur(14px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,.06)"
      }}
    >
      {/* Blue logo orb with "2177" text. Click → open portal + toggle sidebar */}
      <button 
        className="topbar-orb"
        onClick={() => { bus.emit("avatar-portal:open"); bus.emit("sidebar:toggle"); }}
        aria-label="Open"
      >
        <span className="topbar-orb-text">2177</span>
      </button>

      {/* Center: brand text (shortened to avoid duplication) */}
      <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>superNova</div>

      {/* Right actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button 
          onClick={() => bus.emit("sidebar:toggle")} 
          aria-label="Menu"
          style={{ 
            width: 40, height: 40, borderRadius: 10, 
            background: "rgba(255,255,255,.08)", 
            border: "1px solid rgba(255,255,255,.14)" 
          }}
        >
          ≡
        </button>
      </div>
    </header>
  );
}