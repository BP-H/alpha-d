import { useEffect, useRef, useState } from "react";

type Props = {
  onAnalyzeImage: (imgUrl: string) => void;
};

type Mode = "idle" | "menu" | "analyze";

const HOLD_MS = 600;
const SNAP_PADDING = 12;

export default function PortalOrb({ onAnalyzeImage }: Props) {
  const orbRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<number | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem("orb-pos");
    return saved ? JSON.parse(saved) : { x: 16, y: 16 };
  });
  const [dragging, setDragging] = useState(false);
  const lastTap = useRef<number>(0);
  const analyzeOverlay = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("orb-pos", JSON.stringify(pos));
    if (orbRef.current) {
      orbRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }
  }, [pos]);

  function withinSafe(x: number, y: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const size = 64;
    return {
      x: Math.min(Math.max(x, SNAP_PADDING), w - size - SNAP_PADDING),
      y: Math.min(Math.max(y, SNAP_PADDING), h - size - SNAP_PADDING),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);

    // double-tap to snap top-left + vortex
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setMenuOpen(false);
      setMode("idle");
      setPos({ x: 12, y: 12 });
      orbRef.current?.classList.add("vortex");
      window.setTimeout(
        () => orbRef.current?.classList.remove("vortex"),
        900
      );
      return;
    }
    lastTap.current = now;

    setDragging(true);
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;

    // long-press => open radial menu
    holdRef.current = window.setTimeout(() => {
      setMenuOpen(true);
      setMode("menu");
      orbRef.current?.classList.add("grow");
    }, HOLD_MS);

    function move(ev: PointerEvent) {
      if (!dragging) return;
      const next = withinSafe(ev.clientX - startX, ev.clientY - startY);
      setPos(next);
    }

    function up(ev: PointerEvent) {
      setDragging(false);
      if (holdRef.current) {
        clearTimeout(holdRef.current);
        holdRef.current = null;
      }

      // If we were in analyze mode, try to capture the thing under the orb
      if (mode === "analyze") {
        const el = document.elementFromPoint(ev.clientX, ev.clientY) as
          | HTMLElement
          | null;
        const url = el?.closest("[data-asset]")?.getAttribute("data-asset");
        if (url) onAnalyzeImage(url);
        setMode("idle");
        setMenuOpen(false);
        teardownAnalyzeOverlay();
      }

      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function handlePointerCancel() {
    setDragging(false);
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  }

  function startAnalyze() {
    setMode("analyze");
    setMenuOpen(false);
    orbRef.current?.classList.remove("grow");
    setupAnalyzeOverlay();
  }

  function setupAnalyzeOverlay() {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "55";
    overlay.style.background =
      "radial-gradient(600px 600px at var(--x,50%) var(--y,50%), rgba(10,132,255,.18), transparent 60%)";
    overlay.style.transition = "background .2s ease";
    overlay.className = "analyze-overlay";
    analyzeOverlay.current = overlay;
    document.body.appendChild(overlay);
  }

  function teardownAnalyzeOverlay() {
    analyzeOverlay.current?.remove();
    analyzeOverlay.current = null;
  }

  function onPointerMoveForOverlay(e: React.PointerEvent) {
    if (mode !== "analyze" || !analyzeOverlay.current) return;
    analyzeOverlay.current.style.setProperty("--x", `${e.clientX}px`);
    analyzeOverlay.current.style.setProperty("--y", `${e.clientY}px`);
  }

  return (
    <>
      <div
        ref={orbRef}
        className={`portal-orb ${menuOpen ? "open" : ""} ${
          mode === "analyze" ? "analyzing" : ""
        }`}
        onPointerDown={handlePointerDown}
        onPointerCancel={handlePointerCancel}
        onPointerMove={onPointerMoveForOverlay}
        role="button"
        aria-label="AI Portal"
        title="AI Portal"
      >
        {/* inner glow */}
        <div className="orb-core" />
        {/* radial menu */}
        {menuOpen && (
          <div className="radial-menu">
            <button className="rm-item" onClick={startAnalyze} title="Analyze">
              <svg viewBox="0 0 24 24" className="ico">
                <path
                  d="M15.5 15.5L21 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="square"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
              <span>Analyze</span>
            </button>
            <button
              className="rm-item"
              onClick={() => {
                setMenuOpen(false);
                orbRef.current?.classList.remove("grow");
                // placeholder “compose” action
                alert("Compose: hook this to your AI API.");
              }}
              title="Compose"
            >
              <svg className="ico" viewBox="0 0 24 24">
                <path
                  d="M4 20h16M4 4h12l4 4v8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span>Compose</span>
            </button>
            <button
              className="rm-item"
              onClick={() => {
                setMode("idle");
                setMenuOpen(false);
                orbRef.current?.classList.remove("grow");
              }}
              title="Close"
            >
              <svg className="ico" viewBox="0 0 24 24">
                <path
                  d="M5 5l14 14M19 5L5 19"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span>Close</span>
            </button>
          </div>
        )}
      </div>

      {/* styles */}
      <style>{`
        .portal-orb{
          position:fixed;left:0;top:0;z-index:56;
          width:64px;height:64px;transform:translate(${pos.x}px,${pos.y}px);
          transition:transform .18s ease;
          contain:layout paint;
        }
        .orb-core{
          width:100%;height:100%;
          background:
            radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,.9), rgba(255,255,255,.2) 65%, transparent 70%),
            radial-gradient(80% 80% at 70% 70%, rgba(10,132,255,.8), rgba(10,132,255,.2) 70%, transparent 72%),
            radial-gradient(120% 120% at 50% 50%, rgba(10,132,255,.2), transparent 60%);
          border:1px solid var(--stroke-2);
          box-shadow:0 0 0 1px rgba(255,255,255,.06) inset, 0 8px 40px rgba(10,132,255,.35);
        }

        .portal-orb.open .orb-core{
          animation:pulse 1.6s ease infinite;
        }
        @keyframes pulse{
          0%{box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 8px 40px rgba(10,132,255,.35)}
          50%{box-shadow:0 0 0 1px rgba(255,255,255,.1) inset,0 8px 60px rgba(10,132,255,.55)}
          100%{box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 8px 40px rgba(10,132,255,.35)}
        }

        .portal-orb.grow .orb-core{ transform:scale(1.08) }

        .portal-orb.vortex .orb-core{
          background:
            conic-gradient(from 0deg, rgba(10,132,255,.8), rgba(155,134,255,.8), rgba(110,168,254,.8), rgba(10,132,255,.8));
          animation:spin 0.9s ease forwards;
        }
        @keyframes spin{ to{ filter:hue-rotate(90deg) saturate(1.3) } }

        .radial-menu{
          position:absolute;inset:-30px;display:grid;place-items:center;pointer-events:none;
        }
        .rm-item{
          position:absolute;pointer-events:auto;
          display:grid;place-items:center;gap:6px;padding:6px 8px;background:rgba(16,18,24,.9);
          border:1px solid var(--stroke-2);color:#fff;
        }
        .rm-item:nth-child(1){transform:translate(-94px,0)}
        .rm-item:nth-child(2){transform:translate(94px,0)}
        .rm-item:nth-child(3){transform:translate(0,94px)}
        .rm-item .ico{width:18px;height:18px}
        .analyzing .orb-core{ box-shadow:0 0 0 1px rgba(255,255,255,.08) inset, 0 10px 70px rgba(10,132,255,.7) }
      `}</style>
    </>
  );
}
