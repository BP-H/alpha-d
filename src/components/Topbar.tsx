import React, { useLayoutEffect, useRef } from "react";
import bus from "../lib/bus";

export default function Topbar() {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const setH = () => {
      document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`);
    };
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
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 40,
        height: 56,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "8px 12px",
        background: "var(--glass)",
        backdropFilter: "blur(14px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}
    >
      {/* 🔵 Blue brand orb — click to open menu with portal animation */}
      <button
        onClick={(e) => {
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          // Emit portal burst at this button's center, then open sidebar
          bus.emit("orb:portal", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
          bus.emit("sidebar:toggle");
        }}
        aria-label="Open brand menu"
        style={{
          position: "relative",
          width: 40, height: 40,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.18)",
          background: "radial-gradient(120% 120% at 30% 30%, #fff, #dbe4ff 60%, #4f7afe)",
          boxShadow: "0 0 0 6px rgba(79,122,254,.18)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            letterSpacing: 0.6,
            color: "#ecf2ff",
            textShadow: "0 2px 8px rgba(0,0,0,.35)",
            fontSize: 12,
          }}
        >
          2177
        </span>
      </button>

      {/* Center: Brand text/title */}
      <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>superNova_2177</div>

      {/* Right-side actions (menu button) */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => bus.emit("sidebar:toggle")}
          aria-label="Menu"
          style={{
            width: 40, height: 40,
            borderRadius: 10,
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.14)",
          }}
        >
          ≡
        </button>
      </div>
    </header>
  );
}