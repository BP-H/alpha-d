import React, { useLayoutEffect, useRef } from "react";
import bus from "../lib/bus";

export default function Topbar(){
  const ref = useRef<HTMLElement|null>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const setH = () => document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`);
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={ref} className="topbar" style={{
      position:"fixed", top:0, left:0, right:0, zIndex: 40,
      height: 56, display:"grid", gridTemplateColumns: "auto 1fr auto", gap:12, alignItems:"center",
      padding: "8px 12px",
      background:"var(--glass)", backdropFilter:"blur(14px) saturate(160%)",
      borderBottom:"1px solid rgba(255,255,255,.06)"
    }}>
      {/* Pink logo (future 3D avatar). Click → fancy portal open + toggle sidebar */}
      <button
        onClick={() => { bus.emit("avatar-portal:open"); bus.emit("sidebar:toggle"); }}
        aria-label="Open"
        style={{
          width:40, height:40, borderRadius:999, border:"1px solid rgba(255,255,255,.18)",
          background: "radial-gradient(120% 120% at 30% 30%, #fff, #ffc6f3 60%, var(--pink))",
          boxShadow: "0 0 0 6px rgba(255, 116, 222, .15)"
        }}
      />

      {/* Center: brand text */}
      <div style={{ fontWeight:900, letterSpacing:.3 }}>superNova_2177</div>

      {/* Right actions kept minimal — orb handles search */}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => bus.emit("sidebar:toggle")} aria-label="Menu"
          style={{ width:40, height:40, borderRadius:10, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.14)" }}>≡</button>
      </div>
    </header>
  );
}
