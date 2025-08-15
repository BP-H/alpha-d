// src/components/AssistantOrb.tsx
import React, { useEffect, useRef, useState } from "react";
import bus from "../lib/bus";
import type { AssistantMessage, Post } from "../types";

/**
 * Assistant Orb — pink, draggable, hold-to-talk, drag over a post to link.
 * Full replacement. No external CSS; styles are inline.
 */

/* Loose SpeechRecognition type to avoid dom lib juggling */
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (e?: any) => void;
  onresult?: (e?: any) => void;
  start?: () => void;
  stop?: () => void;
};

const ORB_SIZE = 76;
const ORB_MARGIN = 12;
const ORB_RADIUS = ORB_SIZE / 2;
const HOLD_MS = 280;

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const within = (n: number, tol: number) => Math.abs(n) <= tol;

export default function AssistantOrb() {
  // ---------- position (top/left) ----------
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    return {
      x: Math.max(ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN),
      y: Math.max(ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN),
    };
  });

  // keep inside viewport on resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: clamp(p.x, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN)),
        y: clamp(p.y, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN)),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------- drag state ----------
  const [dragging, setDragging] = useState(false);
  const pressRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const movedRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoverIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);

  // ---------- chat + mic ----------
  const [open, setOpen] = useState(false);
  const [mic, setMic] = useState(false);
  const [interim, setInterim] = useState("");
  const [toast, setToast] = useState("");
  const [msgs, setMsgs] = useState<AssistantMessage[]>([]);
  const [ctxPost, setCtxPost] = useState<Post | null>(null);

  useEffect(() => {
    const u1 = bus.on?.("feed:hover", (p: { post: Post }) => setCtxPost(p.post));
    const u2 = bus.on?.("feed:select", (p: { post: Post }) => setCtxPost(p.post));
    return () => {
      try { u1?.(); } catch {}
      try { u2?.(); } catch {}
    };
  }, []);

  // ---------- speech recognition ----------
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const restartRef = useRef(false);

  function ensureRec(): SpeechRecognitionLike | null {
    if (recRef.current) return recRef.current;
    const C =
      (typeof window !== "undefined" && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) ||
      null;
    if (!C) {
      setToast("Voice not supported");
      return null;
    }
    const rec: SpeechRecognitionLike = new (C as any)();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setMic(true);
      setToast("Listening…");
    };
    rec.onend = () => {
      setMic(false);
      setToast("");
      if (restartRef.current) {
        try { rec.start?.(); } catch {}
      }
    };
    rec.onerror = () => {
      setMic(false);
      setToast("Mic error");
    };
    rec.onresult = (e: any) => {
      let interimT = "";
      const finals: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript || "";
        if (r.isFinal) finals.push(t);
        else interimT += t;
      }
      setInterim(interimT.trim());
      const final = finals.join(" ").trim();
      if (final) {
        setInterim("");
        handleCommand(final);
      }
    };

    recRef.current = rec;
    return rec;
  }

  function startListening() {
    if (mic) return;
    const r = ensureRec();
    if (!r) return;
    restartRef.current = true;
    try {
      r.start?.();
    } catch {
      setMic(false);
      setToast("Mic error");
    }
  }
  function stopListening() {
    restartRef.current = false;
    try { recRef.current?.stop?.(); } catch {}
    setMic(false);
    setInterim("");
  }

  // ---------- commands (minimal) ----------
  async function handleCommand(text: string) {
    const post = ctxPost || null;
    const push = (m: AssistantMessage) => setMsgs((s) => [...s, m]);

    push({ id: crypto.randomUUID(), role: "user", text, ts: Date.now(), postId: (post?.id as any) });

    const T = text.trim();
    const lower = T.toLowerCase();

    if (lower.startsWith("/react")) {
      const emoji = T.replace("/react", "").trim() || "❤️";
      if (post) {
        bus.emit("post:react", { id: post.id, emoji });
        push({
          id: crypto.randomUUID(),
          role: "assistant",
          text: `✨ Reacted ${emoji} on ${post.id}`,
          ts: Date.now(),
          postId: (post.id as any),
        });
      } else {
        push({ id: crypto.randomUUID(), role: "assistant", text: `⚠️ Drag the orb over a post first.`, ts: Date.now() });
      }
      return;
    }

    // fallback reply stub
    push({ id: crypto.randomUUID(), role: "assistant", text: `🤖 I heard: “${T}” (stub)`, ts: Date.now() });
  }

  // ---------- hover helpers ----------
  function setHoverTargetId(id: string | null) {
    if (hoverIdRef.current) {
      document.querySelector(`[data-post-id="${hoverIdRef.current}"]`)?.classList.remove("pc-target");
      hoverIdRef.current = null;
    }
    if (id) {
      const el = document.querySelector(`[data-post-id="${id}"]`) as HTMLElement | null;
      if (el) {
        el.classList.add("pc-target");
        hoverIdRef.current = id;
      }
    }
  }

  // ---------- pointer handlers ----------
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // capture pointer and remember offset from orb origin
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    const offsetX = e.clientX - pos.x;
    const offsetY = e.clientY - pos.y;
    pressRef.current = { pointerId: e.pointerId, offsetX, offsetY };
    movedRef.current = false;
    suppressClickRef.current = false;
    setDragging(true);

    // hold-to-talk
    if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); }
    holdTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      startListening();
    }, HOLD_MS);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!pressRef.current) return;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    if (moveRafRef.current !== null) return;
    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = null;
      const cur = lastPointerRef.current;
      const pr = pressRef.current;
      if (!cur || !pr) return;

      const nx = clamp(
        cur.x - pr.offsetX,
        ORB_MARGIN,
        Math.max(ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN)
      );
      const ny = clamp(
        cur.y - pr.offsetY,
        ORB_MARGIN,
        Math.max(ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN)
      );

      const dx = nx - pos.x;
      const dy = ny - pos.y;
      if (!movedRef.current && within(Math.hypot(dx, dy), 3)) return;

      movedRef.current = true;
      // cancel hold if we started moving
      if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      setPos({ x: nx, y: ny });

      // while dragging, let elementFromPoint see content under the pointer
      // (pointer-capture ensures we still receive events)
      // We toggle pointerEvents via "dragging" state in style.

      // highlight post under cursor
      const under = document.elementFromPoint(cur.x, cur.y) as HTMLElement | null;
      const target = under?.closest?.("[data-post-id]") as HTMLElement | null;
      const id = target?.dataset.postId || null;
      if (id !== hoverIdRef.current) {
        setHoverTargetId(id);
        if (id) bus.emit?.("feed:select-id", { id });
      }
    });
  }

  function endPointer(e: React.PointerEvent<HTMLButtonElement>) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (moveRafRef.current !== null) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null; }
    lastPointerRef.current = null;

    const dragged = movedRef.current;
    movedRef.current = false;
    pressRef.current = null;
    setDragging(false);

    // stop listening if we started via hold
    if (mic && suppressClickRef.current) {
      stopListening();
      // link to post under pointer if we dragged
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const target = under?.closest?.("[data-post-id]") as HTMLElement | null;
      if (dragged && target) {
        const id = target.dataset.postId!;
        bus.emit("post:focus", { id });
        setToast(`🎯 linked to ${id}`);
        window.setTimeout(() => setToast(""), 1100);
      }
    }

    // clear hover highlight
    setHoverTargetId(null);

    // release click suppression next frame
    requestAnimationFrame(() => { suppressClickRef.current = false; });
  }

  function onClick() {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    setOpen((v) => !v);
  }

  // ---------- unmount cleanup ----------
  useEffect(() => {
    return () => {
      restartRef.current = false;
      try { recRef.current?.stop?.(); } catch {}
      recRef.current = null;
      if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      if (moveRafRef.current !== null) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null; }
      setHoverTargetId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- styles ----------
  const orbStyle: React.CSSProperties = {
    position: "fixed",
    left: pos.x,
    top: pos.y,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE,
    zIndex: 9999,
    display: "grid",
    placeItems: "center",
    cursor: dragging ? "grabbing" : "grab",
    boxShadow: mic
      ? "0 18px 44px rgba(255,116,222,0.24), 0 0 0 12px rgba(255,116,222,0.12)"
      : "0 12px 30px rgba(0,0,0,0.35)",
    background: "radial-gradient(120% 120% at 30% 30%, #fff, #ffd7f5 60%, #ff74de)",
    border: "1px solid rgba(255,255,255,0.12)",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    // 👇 key to glitch-free hover while dragging
    pointerEvents: dragging ? ("none" as const) : ("auto" as const),
    transition: dragging ? "none" : "box-shadow .2s ease",
  };

  const coreStyle: React.CSSProperties = {
    width: ORB_SIZE - 20,
    height: ORB_SIZE - 20,
    borderRadius: "50%",
    background:
      "radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.28) 65%, transparent 70%)",
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
  };

  const panelSideRight = pos.x < window.innerWidth / 2; // if orb is on left half, open panel to its right
  const panelXStyle: React.CSSProperties = panelSideRight
    ? { left: pos.x + ORB_SIZE + 8 }
    : { right: Math.max(ORB_MARGIN, window.innerWidth - pos.x + 8) };
  const panelTop = clamp(pos.y - 160, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerHeight - 260));

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: panelTop,
    ...panelXStyle,
    width: 320,
    maxWidth: "42vw",
    background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    zIndex: 9998,
    boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px) saturate(120%)",
  };

  const toastStyle: React.CSSProperties = {
    position: "fixed",
    left: pos.x + ORB_SIZE + 8,
    top: pos.y + ORB_RADIUS,
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 10,
    fontSize: 13,
    zIndex: 9998,
    pointerEvents: "none",
  };

  // ---------- render ----------
  return (
    <>
      <button
        aria-label="Assistant orb"
        title="Assistant — hold to talk, drag to link a post"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        onClick={onClick}
        style={orbStyle}
      >
        <div style={coreStyle} />
        {/* subtle pink ring when listening */}
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            pointerEvents: "none",
            boxShadow: mic ? "0 0 0 10px rgba(255,116,222,0.16)" : "none",
            transition: "box-shadow .25s ease",
          }}
        />
      </button>

      {toast && <div style={toastStyle}>{toast}</div>}
      {interim ? (
        <div
          style={{
            ...toastStyle,
            top: pos.y - 28,
          }}
        >
          {interim}
        </div>
      ) : null}

      {open && (
        <div style={panelStyle}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Assistant</div>
          <div style={{ fontSize: 13, color: "var(--muted, #bfc6d8)" }}>
            {msgs.length ? msgs[msgs.length - 1].text : "Hi — hold to speak or type below."}
          </div>
          <div style={{ height: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                startListening();
                setToast("Listening…");
              }}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: "none",
                background: "#ff74de",
                color: "#111",
                fontWeight: 800,
              }}
            >
              🎤 Speak
            </button>
            <button
              onClick={() => {
                stopListening();
                setToast("");
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "transparent",
                color: "#fff",
              }}
            >
              ✖
            </button>
          </div>
        </div>
      )}
    </>
  );
}
