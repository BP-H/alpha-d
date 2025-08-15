// src/components/AssistantOrb.tsx
import React, { useEffect, useRef, useState } from "react";
import bus from "../lib/bus";
import type { AssistantMessage, Post } from "../types";

/**
 * Assistant Orb — final, fast, and robust.
 * - 60fps drag via translate3d on a ref (no re-renders while moving)
 * - Pointer capture + temporary pointerEvents:none for accurate hit-testing
 * - Hold 280ms to start voice; mic state follows SpeechRecognition events
 * - Release over a post after a drag → links that post (toast)
 * - Side‑aware toasts & panel (follow the orb via refs, not state)
 * - Lost pointer capture safe; ESC closes panel & stops mic
 * - Tap vs drag suppression; position persisted to localStorage
 * - Emoji drawer (🌀 / 🎬 + reactions) + /comment, /react, /world, /remix
 */

/* Minimal SpeechRecognition type (no DOM lib) */
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
const DRAG_THRESHOLD = 5;
const STORAGE_KEY = "assistantOrbPos.v3";
const PANEL_WIDTH = 360; // used for side-awareness; actual width is measured when available

const EMOJI_LIST: string[] = [
  "🤗","😂","🤣","😅","🙂","😉","😍","😎","🥳","🤯","😡","😱","🤔","🤭","🙄","🥺","🤪","🤫","🤤","😴",
  "👻","🤖","💀","👽","😈","👋","👍","👎","👏","🙏","👀","💪","🫶","💅","🔥","✨","⚡","💥","❤️","🧡",
  "💛","💚","💙","💜","🖤","🤍","💔","❤️‍🔥","❤️‍🩹","💯","💬","🗯️","🎉","🎊","🎁","🏆","⚽","🎮","🚀",
  "✈️","🚗","🏠","📱","💡","🎵","🎶","📢","📚","📅","📈","✅","❌","❗","❓","‼️","⚠️","🌀","🎬","🦄",
  "🍕","🍔","🍎","🍺","🌈","✏️","🖊️","⚙️","🧩","🫠","🫡","🫨","🤡","🤝","🫰","🤌","🫵","🫂","🧠","🗿"
];

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const uuid = () => {
  const g: any = globalThis as any;
  try { return g?.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); }
  catch { return Math.random().toString(36).slice(2); }
};

// Stub LLM (wire to backend later)
async function askLLMStub(text: string): Promise<string> {
  return `🤖 (stub) I heard: “${text}”`;
}

export default function AssistantOrb() {
  // --- committed pos (for initial paint + persistence)
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
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

  // live pos (mutated during drag without re-render)
  const posRef = useRef<{ x: number; y: number }>({ ...pos });

  // --- UI & state
  const [open, setOpen] = useState(false);
  const [mic, setMic] = useState(false);
  const [toast, setToast] = useState("");
  const [interim, setInterim] = useState("");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<AssistantMessage[]>([]);
  const [ctxPost, setCtxPost] = useState<Post | null>(null);
  const [dragging, setDragging] = useState(false);

  // --- refs
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const interimRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const msgListRef = useRef<HTMLDivElement | null>(null);

  // drag refs
  const movedRef = useRef(false);
  const pressRef = useRef<{ id: number; dx: number; dy: number; sx: number; sy: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const lastPtrRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const preventTapRef = useRef(false);
  const hoverIdRef = useRef<string | null>(null);

  // mic
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const restartRef = useRef(false);

  // --- feed context wiring
  useEffect(() => {
    const a = bus.on?.("feed:hover", (p: { post: Post }) => setCtxPost(p.post));
    const b = bus.on?.("feed:select", (p: { post: Post }) => setCtxPost(p.post));
    return () => { try { a?.(); } catch {} try { b?.(); } catch {} };
  }, []);

  // --- Speech Recognition
  function ensureRec(): SpeechRecognitionLike | null {
    if (recRef.current) return recRef.current;
    if (typeof window === "undefined") return null;
    const C = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!C) { setToast("Voice not supported"); return null; }
    const rec: SpeechRecognitionLike = new C();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onstart = () => { setMic(true); setToast("Listening…"); updateAnchors(); };
    rec.onend   = () => { setMic(false); setToast(""); updateAnchors(); if (restartRef.current) { try { rec.start?.(); } catch {} } };
    rec.onerror = () => { setMic(false); setToast("Mic error"); updateAnchors(); };
    rec.onresult = (e: any) => {
      let temp = ""; const finals: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]; const t = r[0]?.transcript || "";
        r.isFinal ? finals.push(t) : (temp += t);
      }
      setInterim(temp.trim());
      updateAnchors();
      const final = finals.join(" ").trim();
      if (final) { setInterim(""); handleCommand(final); }
    };
    recRef.current = rec;
    return rec;
  }

  function startListening() {
    if (mic) return;
    const r = ensureRec(); if (!r) return;
    restartRef.current = true;
    try { r.start?.(); } catch { setToast("Mic error"); setMic(false); updateAnchors(); }
  }

  function stopListening() {
    restartRef.current = false;
    try { recRef.current?.stop?.(); } catch {}
    setMic(false);
    setInterim("");
    updateAnchors();
  }

  // --- Commands
  const push = (m: AssistantMessage) => setMsgs(s => [...s, m]);

  async function handleCommand(text: string) {
    const post = ctxPost || null;
    push({ id: uuid(), role: "user", text, ts: Date.now(), postId: (post?.id as any) });

    const T = text.trim();
    const lower = T.toLowerCase();

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

    if (lower.startsWith("/comment ")) {
      const body = T.slice(9).trim();
      if (post) {
        bus.emit?.("post:comment", { id: post.id, body });
        push({ id: uuid(), role: "assistant", text: `💬 Commented: ${body}`, ts: Date.now(), postId: (post.id as any) });
      } else {
        push({ id: uuid(), role: "assistant", text: `⚠️ Drag the orb onto a post to comment.`, ts: Date.now() });
      }
      return;
    }

    if (lower.startsWith("/world")) {
      bus.emit?.("orb:portal", { x: posRef.current.x, y: posRef.current.y });
      push({ id: uuid(), role: "assistant", text: `🌀 Entering world…`, ts: Date.now(), postId: (post?.id as any) });
      return;
    }

    if (lower.startsWith("/remix")) {
      if (post) {
        bus.emit("post:remix", { id: post.id });
        push({ id: uuid(), role: "assistant", text: `🎬 Remixing ${post.id}`, ts: Date.now(), postId: (post.id as any) });
      } else {
        push({ id: uuid(), role: "assistant", text: `⚠️ Drag the orb onto a post to remix.`, ts: Date.now() });
      }
      return;
    }

    // fallback
    const responseText = await askLLMStub(T);
    push({ id: uuid(), role: "assistant", text: responseText, ts: Date.now() });
  }

  function handleEmojiClick(e: string) {
    if (e === "🌀") handleCommand("/world");
    else if (e === "🎬") handleCommand("/remix");
    else handleCommand(`/react ${e}`);
  }

  // --- DOM helpers
  function applyTransform(x: number, y: number) {
    const el = orbRef.current; if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

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

  // anchors (toast/interim/panel) follow orb without re-render
  function updateAnchors() {
    if (typeof window === "undefined") return;
    const { x, y } = posRef.current;

    // Which side has room for panel?
    const panelEl = panelRef.current;
    const measuredPanelW = panelEl?.offsetWidth || PANEL_WIDTH;
    const spaceRight = window.innerWidth - (x + ORB_SIZE + 8);
    const placeRight = spaceRight >= (measuredPanelW + 12);

    // Toast
    if (toastRef.current) {
      const s = toastRef.current.style;
      s.position = "fixed";
      s.top = `${y + ORB_SIZE / 2}px`;
      s.left = placeRight ? `${x + ORB_SIZE + 8}px` : `${x - 8}px`;
      s.transform = placeRight ? "translateY(-50%)" : "translate(-100%, -50%)";
    }

    // Interim (live transcript)
    if (interimRef.current) {
      const s = interimRef.current.style;
      s.position = "fixed";
      s.top = `${Math.max(ORB_MARGIN, y - 30)}px`;
      s.left = placeRight ? `${x + ORB_SIZE + 8}px` : `${x - 8}px`;
      s.transform = placeRight ? "none" : "translateX(-100%)";
    }

    // Panel
    if (panelEl && open) {
      const s = panelEl.style;
      const panelH = panelEl.offsetHeight || 260;
      const top = clamp(y - 160, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerHeight - panelH - ORB_MARGIN));
      s.position = "fixed";
      s.top = `${top}px`;
      s.left = placeRight ? `${x + ORB_SIZE + 8}px` : `${x - 8}px`;
      s.transform = placeRight ? "none" : "translateX(-100%)";
    }
  }

  // --- mount
  useEffect(() => {
    applyTransform(pos.x, pos.y);
    posRef.current = { ...pos };
    updateAnchors();
  }, []); // eslint-disable-line

  // update anchors when UI visibility/strings change
  useEffect(() => { updateAnchors(); }, [open, toast, interim]);

  // scroll messages to bottom on new message
  useEffect(() => {
    const el = msgListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  // resize + ESC handlers
  useEffect(() => {
    const onResize = () => {
      if (typeof window === "undefined") return;
      const nx = clamp(posRef.current.x, ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN);
      const ny = clamp(posRef.current.y, ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN);
      posRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });
      applyTransform(nx, ny);
      updateAnchors();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); stopListening(); } };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("keydown", onKey); };
  }, []); // eslint-disable-line

  // unmount cleanup
  useEffect(() => {
    return () => {
      try { recRef.current?.stop?.(); } catch {}
      recRef.current = null; restartRef.current = false;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (moveRafRef.current != null) cancelAnimationFrame(moveRafRef.current);
      setHover(null);
    };
  }, []);

  // --- Pointer handlers
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = orbRef.current; if (!el) return;
    try { el.setPointerCapture(e.pointerId); } catch {}
    const dx = e.clientX - posRef.current.x;
    const dy = e.clientY - posRef.current.y;
    pressRef.current = { id: e.pointerId, dx, dy, sx: e.clientX, sy: e.clientY };
    movedRef.current = false;
    preventTapRef.current = false;
    setDragging(true);

    // let underlying posts receive hit-tests while we still get events via capture
    el.style.pointerEvents = "none";

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => { suppressClickRef.current = true; startListening(); }, HOLD_MS);
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
      updateAnchors();

      // highlight post under pointer
      const under = document.elementFromPoint(cur.x, cur.y) as HTMLElement | null;
      const target = under?.closest?.("[data-post-id]") as HTMLElement | null;
      const id = target?.dataset.postId || null;
      if (id !== hoverIdRef.current) {
        setHover(id);
        if (id) bus.emit?.("feed:select-id", { id });
      }
    });
  };

  const finishGesture = (clientX: number, clientY: number) => {
    // commit for panel anchoring & persistence
    setPos({ ...posRef.current });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)); } catch {}
    updateAnchors();

    // if hold started mic: stop and (if dragged) link the post under release point
    if (mic && suppressClickRef.current) {
      stopListening();
      if (movedRef.current) {
        const under = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
        const target = under?.closest?.("[data-post-id]") as HTMLElement | null;
        if (target?.dataset.postId) {
          const id = target.dataset.postId;
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

    const el = orbRef.current; if (el) el.style.pointerEvents = "auto";
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (moveRafRef.current != null) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null; }
    lastPtrRef.current = null;

    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    finishGesture(e.clientX, e.clientY);
  };

  const onLostPointerCapture = () => {
    // Finish cleanly if browser/OS steals capture
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (moveRafRef.current != null) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null; }
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
    requestAnimationFrame(updateAnchors);
  };

  // --- styles (inline; no global CSS)
  const orbStyle: React.CSSProperties = {
    position: "fixed",
    left: 0, top: 0,
    width: ORB_SIZE, height: ORB_SIZE, borderRadius: 999,
    zIndex: 9999, display: "grid", placeItems: "center",
    userSelect: "none", touchAction: "none",
    border: "1px solid rgba(255,255,255,.12)",
    background: "radial-gradient(120% 120% at 30% 30%, #fff, #ffc6f3 60%, #ff74de)",
    boxShadow: mic
      ? "0 18px 44px rgba(255,116,222,.24), 0 0 0 12px rgba(255,116,222,.12)"
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

  const toastBoxStyle: React.CSSProperties = {
    position: "fixed",
    background: "rgba(0,0,0,.7)",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 10,
    fontSize: 13,
    zIndex: 9998,
    pointerEvents: "none",
  };

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    width: PANEL_WIDTH, maxWidth: "90vw",
    background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02))",
    border: "1px solid rgba(255,255,255,.06)",
    borderRadius: 14, padding: 12, zIndex: 9998,
    boxShadow: "0 16px 40px rgba(0,0,0,.45)",
    backdropFilter: "blur(10px) saturate(140%)",
  };

  // --- render
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

      {/* Toast + interim (positions updated via updateAnchors) */}
      {toast && (
        <div ref={toastRef} style={toastBoxStyle} aria-live="polite">
          {toast}
        </div>
      )}
      {interim && (
        <div ref={interimRef} style={toastBoxStyle} aria-live="polite">
          …{interim}
        </div>
      )}

      {/* Panel (position updated via updateAnchors) */}
      {open && (
        <div ref={panelRef} style={panelStyle}>
          <div style={{ fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center" }}>
            Assistant
            <span style={{ fontSize: 12, opacity: 0.75, marginLeft: 8 }}>
              {ctxPost ? `linked: ${ctxPost.title || ctxPost.author || ctxPost.id}` : "no post context"}
            </span>
          </div>

          {/* Messages */}
          <div
            ref={msgListRef}
            style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", padding: "4px 0" }}
          >
            {msgs.length === 0 && (
              <div style={{ fontSize: 13, opacity: .75 }}>
                Try: <code>/comment hi</code> &nbsp;
                <code>/react ❤️</code> &nbsp;
                <code>/world</code> &nbsp;
                <code>/remix</code>
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "80%",
                    background: m.role === "user" ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.14)",
                    padding: "8px 10px", borderRadius: 12
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Emoji drawer */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: 6,
              marginTop: 10,
              maxHeight: 190,
              overflowY: "auto",
              padding: 4,
              borderRadius: 10,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.06)"
            }}
          >
            {EMOJI_LIST.map(e => (
              <button
                key={e}
                onClick={() => handleEmojiClick(e)}
                style={{
                  fontSize: 20, lineHeight: "28px",
                  background: "transparent", color: "inherit",
                  border: "none", cursor: "pointer",
                  borderRadius: 8, padding: "4px 2px"
                }}
                aria-label={`React ${e}`}
                title={`React ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Input row */}
          <form
            onSubmit={async e => { e.preventDefault(); const t = input.trim(); if (!t) return; setInput(""); await handleCommand(t); }}
            style={{ display: "flex", gap: 8, marginTop: 10 }}
          >
            <input
              placeholder="Type /comment, /react ❤️, /world, /remix"
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{
                flex: 1, height: 36, padding: "0 10px", borderRadius: 10, outline: "none",
                background: "rgba(16,18,28,.65)", border: "1px solid rgba(255,255,255,.16)", color: "#fff"
              }}
            />
            <button
              type="button"
              onClick={() => (mic ? stopListening() : startListening())}
              style={{
                height: 36, padding: "0 10px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,.16)",
                background: mic ? "rgba(255,116,222,.25)" : "rgba(255,255,255,.08)",
                color: "#fff", cursor: "pointer"
              }}
              title={mic ? "Stop" : "Speak"}
              aria-label="Mic"
            >
              {mic ? "🎙️" : "🎤"}
            </button>
            <button
              type="submit"
              style={{
                height: 36, padding: "0 12px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,.16)",
                background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer"
              }}
              aria-label="Send"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
