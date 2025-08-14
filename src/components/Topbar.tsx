// src/components/Topbar.tsx
import { useLayoutEffect, useRef } from "react";

export default function Topbar() {
  const ref = useRef<HTMLDivElement | null>(null);

  // measure to set --topbar-h (handy if you make other sticky sections)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () =>
      document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={ref} className="topbar" role="banner">
      <strong>superNova • vite</strong>
      <div style={{ flex: 1 }} />
      <input
        placeholder="Search..."
        aria-label="Search"
        style={{
          height: 36,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid var(--line)",
          background: "#fff",
        }}
      />
      <div style={{ width: 8 }} />
      <a className="btn btn--primary" href="https://github.com/BP-H/vite-react" target="_blank" rel="noreferrer">
        Repo
      </a>
    </header>
  );
}
