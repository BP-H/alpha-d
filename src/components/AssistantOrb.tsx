// src/components/AssistantOrb.tsx
import React, { useEffect, useRef, useState } from "react";
import bus from "../lib/bus";
import type { AssistantMessage, Post } from "../types";

/**
 * Assistant Orb — hot‑pink, fast, and robust.
 * - 60fps drag via translate3d on a ref (no React re‑renders while moving)
 * - Pointer capture + temporary pointerEvents:none for correct hit‑testing
 * - Hold 280ms to start voice; mic state follows SpeechRecognition events
 * - Release over a post after a drag to link it (toast)
 * - Side‑aware toasts & panel (auto left/right; clamped)
 * - Handles lostpointercapture; distinguishes tap vs drag; ESC closes/stops
 * - Position persisted in localStorage; SSR‑safe guards
 * - Emoji drawer (+ hooks for /world, /remix)
 */

/* Minimal SpeechRecognition type (avoid DOM lib coupling) */
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
const HOLD_MS = 280;
const DRAG_THRESHOLD = 5; // px before we consider it a drag
const STORAGE_KEY = "assistantOrbPos.v1";
const PANEL_WIDTH = 360;
const TOAST_MIN_ROOM = 200;

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const uuid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** Compact but expressive emoji set */
const EMOJI_LIST: string[] = [
  "🤗","😂","🤣","😅","🙂","😉","😍","😎","🥳","🤯","😡","😱","🤔","🤭","🙄","🥺","🤪","🤫","🤤","😴",
  "👻","🤖","💀","👽","😈","👋","👍","👎","👏","🙏","👀","💪","🫶","💅","🔥","✨","⚡","💥","❤️","🧡",
  "💛","💚","💙","💜","🖤","🤍","💔","❤️‍🔥","❤️‍🩹","💯","💬","🗯️","🎉","🎊","🎁","🏆","⚽","🎮","🚀",
  "✈️","🚗","🏠","📱","💡","🎵","🎶","📢","📚","📅","📈","✅","❌","❗","❓","‼️","⚠️","🌀","🎬","🦄",
  "🍕","🍔","🍎","🍺","🌈","✏️","🖊️","⚙️","🧩","🫠","🫡","🫨","🤡","🤝","🫰","🤌","🫵","🫂","🧠","🗿"
];

export default function AssistantOrb() {
  // ---- committed position (initial paint & panel placement)
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    // Restore last position if available
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { x: number; y: number };
        const nx = clamp(saved.x, ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN);
        const ny = clamp(saved.y, ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN);
        return { x: nx, y: ny };
      }
    } catch {}
    return {
      x: Math.max(ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN),
      y: Math.max(ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN),
    };
  });

  // live position (mutated without re-render during drag)
  const posRef = useRef<{ x: number; y: number }>({ ...pos });

  // ---- UI state
  const [open, setOpen] = useState(false);
  const [mic, setMic] = useState(false);
  const [interim, setInterim] = useState("");
  const [toast, setToast] = useState("");
  const [msgs, setMsgs] = useState<AssistantMessage[]>([]);
  const [ctxPost, setCtxPost] = useState<Post | null>(null);

  // track current post from the feed
  useEffect(() => {
    const a = bus.on?.("feed:hover", (p: { post: Post }) => setCtxPost(p.post));
    const b = bus.on?.("feed:select", (p: { post: Post }) => setCtxPost(p.post));
    return () => { try { a?.(); } catch {} try { b?.(); } catch {} };
  }, []);

  // ---- hover highlight helper
  const hoverIdRef = useRef<string | null>(null);
  function setHover(id: string | null) {
    if (hoverIdRef.current) {
      document.querySelector(`[data-post-id="${hoverIdRef.current}"]`)?.classList.remove("pc-target");
      hoverIdRef.current = null;
    }
    if (id) {
      document.querySelector(`[data-post-id="${id}"]`)?.classList.add("pc-target");
      hoverIdRef.current = id;
    }
  }

  // ---- speech recognition
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const restartRef = useRef(false);

  function ensureRec(): SpeechRecognitionLike | null {
    if (recRef.current) return recRef.current;
    const C =
      (typeof window !== "undefined" &&
        ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) ||
      null;
    if (!C) { setToast("Voice not supported"); return null; }
    const rec: SpeechRecognitionLike = new (C as any)();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";

    rec.onstart = () => { setMic(true); setToast("Listening…"); };
    rec.onend   = () => { setMic(false); setToast(""); if (restartRef.current) try { rec.start?.(); } catch {} };
    rec.onerror = () => { setMic(false); setToast("Mic error"); };
    rec.onresult = (e: any) => {
      let temp = ""; const finals: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]; const t = r[0]?.transcript || "";
        r.isFinal ? (finals.push(t)) : (temp += t);
      }
      setInterim(temp.trim());
      const final = finals.join(" ").trim();
      if (final) { setInterim(""); handleCommand(final); }
    };

    recRef.current = rec;
    return rec;
  }
  function startListening(){ if(mic) return; const r=ensureRec(); if(!r) return; restartRef.current = true; try{ r.start?.(); }catch{ setMic(false); setToast("Mic error"); } }
  function stopListening(){ restartRef.current = false; try{ recRef.current?.stop?.(); }catch{} setMic(false); setInterim(""); }

  // ---- commands
  async function handleCommand(text: string) {
    const post = ctxPost || null;
    const push = (m: AssistantMessage) => setMsgs(s => [...s, m]);

    push({ id: uuid(), role: "user", text, ts: Date.now(), postId: (post?.id as any) });

    const T = text.trim(); const lower = T.toLowerCase();

    if (lower.startsWith("/comment ")) {
      const body = T.slice(9).trim();
      if (post) {
        bus.emit("post:comment", { id: post.id, body });
        push({ id: uuid(), role: "assistant", text: `💬 Commented: ${body}`, ts: Date.now(), postId: (post.id as any) });
      } else {
        push({ id: uuid(), role: "assistant", text: "⚠️ Drag the orb onto a post to link, then /comment", ts: Date.now() });
      }
      return;
    }

    if (lower.startsWith("/react")) {
      const emoji = T.replace("/react", "").trim() || "❤️";
      if (post) {
        bus.emit("post:react", { id: post.id, emoji });
        push({ id: uuid(), role: "assistant", text: `✨ Reacted ${emoji} on ${post.id}`, ts: Date.now(), postId: (post.id as any) });
      } else {
        push({ id: uuid(), role: "assistant", text: "⚠️ Drag the orb over a post first.", ts: Date.now() });
      }
      return;
    }

    if (lower.startsWith("/world")) {
      bus.emit("orb:portal", { post: post || { id: "void" }, x: posRef.current.x, y: posRef.current.y });
      push({ id: uuid(), role: "assistant", text: "🌀 Entering world…", ts: Date.now(), postId: (post?.id as any) });
      return;
    }

    if (lower.startsWith("/remix")) {
      if (post) {
        bus.emit("post:remix", { id: post.id });
        push({ id: uuid(), role: "assistant", text: `🎬 Remix queued for ${post.id}`, ts: Date.now(), postId: (post.id as any) });
      } else {
        push({ id: uuid(), role: "assistant", text: "🎬 Remix: link a post first", ts: Date.now() });
      }
      return;
    }

    // fallback echo (stub)
    push({ id: uuid(), role: "assistant", text: `🤖 I heard: “${T}” (stub)`, ts: Date.now(), postId: (post?.id as any) });
  }

  // ---- DOM refs & movement
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const interimRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  function applyTransform(x: number, y: number) {
    const el = orbRef.current; if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  // Type‑safe helper (works on Element)
  function postIdAtPoint(x: number, y: number): string | null {
    const under = document.elementFromPoint(x, y);
    const target = under ? under.closest?.("[data-post-id]") as Element | null : null;
    return target?.getAttribute("data-post-id") ?? null;
  }

  function updateAuxPositions() {
    if (typeof window === "undefined") return;
    const { x, y } = posRef.current;

    const roomRight = window.innerWidth - (x + ORB_SIZE + 8);
    const hasRoomRightForToast = roomRight >= TOAST_MIN_ROOM;
    const hasRoomRightForPanel = roomRight >= (PANEL_WIDTH + 16);

    // toast
    if (toastRef.current) {
      const s = toastRef.current.style;
      s.position = "fixed";
      s.top = `${y + ORB_SIZE / 2}px`;
      s.left = hasRoomRightForToast ? `${x + ORB_SIZE + 8}px` : `${x - 8}px`;
      s.transform = hasRoomRightForToast ? "translateY(-50%)" : "translate(-100%, -50%)";
    }

    // interim
    if (interimRef.current) {
      const s = interimRef.current.style;
      s.position = "fixed";
      s.top = `${Math.max(ORB_MARGIN, y - 30)}px`;
      s.left = hasRoomRightForToast ? `${x + ORB_SIZE + 8}px` : `${x - 8}px`;
      s.transform = hasRoomRightForToast ? "none" : "translateX(-100%)";
    }

    // panel
    if (panelRef.current && open) {
      const s = panelRef.current.style;
      s.position = "fixed";
      const topClamped = clamp(y - 180, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerHeight - 320));
      s.top = `${topClamped}px`;
      if (hasRoomRightForPanel) {
        s.left = `${x + ORB_SIZE + 8}px`; s.right = ""; s.transform = "none";
      } else {
        s.left = ""; s.right = `${Math.max(ORB_MARGIN, window.innerWidth - (x - 8))}px`; s.transform = "translateX(0)";
      }
    }
  }

  // initial paint
  useEffect(() => {
    applyTransform(pos.x, pos.y);
    posRef.current = { ...pos };
    updateAuxPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep inside viewport on resize (commit once)
  useEffect(() => {
    const onResize = () => {
      if (typeof window === "undefined") return;
      const nx = clamp(posRef.current.x, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN));
      const ny = clamp(posRef.current.y, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN));
      posRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });
      applyTransform(nx, ny);
      updateAuxPositions();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // also update auxiliary elements when toast/interim/panel toggles
  useEffect(() => { updateAuxPositions(); }, [toast, interim, open]);

  // ESC closes/stops; full cleanup on unmount
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); stopListening(); } };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      try { recRef.current?.stop?.(); } catch {}
      recRef.current = null; restartRef.current = false;
      if (hoverIdRef.current) {
        document.querySelector(`[data-post-id="${hoverIdRef.current}"]`)?.classList.remove("pc-target");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- drag state
  const [dragging, setDragging] = useState(false);
  const pressRef = useRef<{ id: number; dx: number; dy: number; sx: number; sy: number } | null>(null);
  const movedRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const lastPtrRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const preventTapRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = orbRef.current; if (!el) return;
    try { el.setPointerCapture(e.pointerId); } catch {}
    const dx = e.clientX - posRef.current.x;
    const dy = e.clientY - posRef.current.y;
    pressRef.current = { id: e.pointerId, dx, dy, sx: e.clientX, sy: e.clientY };
    movedRef.current = false;
    preventTapRef.current = false;
    setDragging(true);

    // let elementFromPoint hit posts while we still receive pointer events via capture
    el.style.pointerEvents = "none";

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      startListening();
    }, HOLD_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pressRef.current) return;
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    if (moveRafRef.current != null) return;

    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = null;
      const cur = lastPtrRef.current; if (!cur) return;

      const { dx, dy, sx, sy } = pressRef.current!;
      const nx = clamp(cur.x - dx, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN));
      const ny = clamp(cur.y - dy, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN));

      if (!movedRef.current && Math.hypot(cur.x - sx, cur.y - sy) > DRAG_THRESHOLD) {
        movedRef.current = true;
        preventTapRef.current = true;
        if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      }

      posRef.current = { x: nx, y: ny };
      applyTransform(nx, ny);
      updateAuxPositions();

      // highlight post under pointer
      const id = postIdAtPoint(cur.x, cur.y);
      if (id !== hoverIdRef.current) {
        setHover(id);
        if (id) bus.emit?.("feed:select-id", { id });
      }
    });
  };

  function finishGesture(clientX: number, clientY: number) {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (moveRafRef.current != null) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null; }
    lastPtrRef.current = null;

    // commit final position (for persistence + panel)
    setPos({ ...posRef.current });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)); } catch {}

    // if mic was started by hold, stop; link only if we actually dragged
    if (mic && suppressClickRef.current) {
      stopListening();
      if (movedRef.current) {
        const id = postIdAtPoint(clientX, clientY);
        if (id) {
          bus.emit("post:focus", { id });
          setToast(`🎯 linked to ${id}`);
          window.setTimeout(() => setToast(""), 1100);
        }
      }
    }

    setHover(null);
    setDragging(false);
    movedRef.current = false;
    suppressClickRef.current = false;

    const el = orbRef.current;
    if (el) el.style.pointerEvents = "auto";
  }

  const onPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    finishGesture(e.clientX, e.clientY);
  };

  const onLostPointerCapture = () => {
    const last = lastPtrRef.current;
    const fallback = { x: posRef.current.x + ORB_SIZE / 2, y: posRef.current.y + ORB_SIZE / 2 };
    finishGesture(last?.x ?? fallback.x, last?.y ?? fallback.y);
  };

  const onClick = () => {
    if (suppressClickRef.current || preventTapRef.current) {
      suppressClickRef.current = false;
      preventTapRef.current = false;
      return;
    }
    setOpen(v => !v);
    requestAnimationFrame(updateAuxPositions);
  };

  // ---- styles (inline — no external CSS)
  const orbStyle: React.CSSProperties = {
    position: "fixed", left: 0, top: 0, width: ORB_SIZE, height: ORB_SIZE, borderRadius: 999,
    zIndex: 9999, display: "grid", placeItems: "center", userSelect: "none", touchAction: "none",
    border: "1px solid rgba(255,255,255,.12)",
    background: "radial-gradient(120% 120% at 30% 30%, #fff, #ffc6f3 60%, #ff74de)",
    boxShadow: mic ? "0 18px 44px rgba(255,116,222,.24), 0 0 0 12px rgba(255,116,222,.12)"
                   : "0 12px 30px rgba(0,0,0,.35)",
    willChange: "transform",
    transition: dragging ? "none" : "box-shadow .2s ease, filter .2s ease",
    cursor: (dragging ? "grabbing" : "grab") as const,
    transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`, // initial; live updates via applyTransform()
  };
  const coreStyle: React.CSSProperties = {
    width: 56, height: 56, borderRadius: 999,
    background: "radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,.95), rgba(255,255,255,.28) 65%, transparent 70%)",
    pointerEvents: "none",
  };
  const ringStyle: React.CSSProperties = {
    position: "absolute", inset: -6, borderRadius: 999, pointerEvents: "none",
    boxShadow: mic ? "0 0 0 10px rgba(255,116,222,.16)" : "inset 0 0 24px rgba(255,255,255,.55)",
    transition: "box-shadow .25s ease",
  };
  const toastBase: React.CSSProperties = {
    position: "fixed",
    background: "rgba(0,0,0,.7)",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 10,
    fontSize: 13,
    zIndex: 9998,
    pointerEvents: "none",
  };

  return (
    <>
      <button
        ref={orbRef}
        aria-label="Assistant orb"
        title="Assistant — hold to talk, drag to link a post"
        style={orbStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onLostPointerCapture}
        onClick={onClick}
      >
        <div style={coreStyle} />
        <div style={ringStyle} />
      </button>

      {/* Toast */}
      {toast && (
        <div ref={toastRef} style={toastBase}>
          {toast}
        </div>
      )}

      {/* Interim speech transcript */}
      {interim && (
        <div ref={interimRef} style={{ ...toastBase }} aria-live="polite">
          …{interim}
        </div>
      )}

      {/* Side panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            width: PANEL_WIDTH, maxWidth: "90vw",
            background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02))",
            border: "1px solid rgba(255,255,255,.06)",
            borderRadius: 14,
            padding: 12,
            zIndex: 9998,
            boxShadow: "0 16px 40px rgba(0,0,0,.45)",
            backdropFilter: "blur(10px) saturate(140%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 22, height: 22, borderRadius: 999,
                border: "1px solid rgba(255,255,255,.2)",
                boxShadow: "0 0 0 4px rgba(255,116,222,.18)",
                background: "radial-gradient(120% 120% at 30% 30%, #fff, #ffc6f3 60%, #ff74de)",
              }}
            />
            <div style={{ fontWeight: 800 }}>
              Assistant
              <div style={{ fontSize: 12, opacity: .8 }}>
                {ctxPost ? `linked: ${ctxPost.title || (ctxPost as any).author || ctxPost.id}` : "no post context"}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginLeft: "auto", height: 28, padding: "0 10px", borderRadius: 8, cursor: "pointer",
                background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.16)"
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Emoji drawer */}
          <div style={{ height: 10 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: 6,
              maxHeight: 190,
              overflowY: "auto",
              padding: 4,
              borderRadius: 10,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.06)",
            }}
          >
            {EMOJI_LIST.map(e => (
              <button
                key={e}
                onClick={() => {
                  if (e === "🌀") { handleCommand("/world"); return; }
                  if (e === "🎬") { handleCommand("/remix"); return; }
                  handleCommand(`/react ${e}`);
                }}
                style={{
                  fontSize: 20, lineHeight: "28px",
                  background: "transparent", color: "inherit",
                  border: "none", cursor: "pointer",
                  borderRadius: 8, padding: "4px 2px",
                }}
                aria-label={`React ${e}`}
                title={`React ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Last message / hint */}
          <div style={{ height: 10 }} />
          <div style={{ fontSize: 13, opacity: .9 }}>
            {msgs.length ? msgs[msgs.length - 1].text : "Tap an emoji to react, or hold the orb to speak."}
          </div>

          {/* Controls */}
          <div style={{ height: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { startListening(); setToast("Listening…"); updateAuxPositions(); }}
              style={{ flex: 1, height: 36, borderRadius: 10, border: "none", background: "#ff74de", color: "#111", fontWeight: 800 }}
            >
              🎤 Speak
            </button>
            <button
              onClick={() => { stopListening(); setToast(""); updateAuxPositions(); }}
              style={{ width: 42, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,.10)", background: "transparent", color: "#fff" }}
              aria-label="Stop"
              title="Stop"
            >
              ✖
            </button>
          </div>
        </div>
      )}
    </>
  );
}
