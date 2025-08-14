import React, { useEffect, useMemo, useRef, useState } from "react";
import bus from "../lib/bus";
import type { AssistantMessage, Post, RemixSpec } from "../types";

/** Utility */
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const ORB_SIZE = 76;
const ORB_RADIUS = ORB_SIZE / 2;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type SpeechRecognitionLike = any;

export default function AssistantOrb() {
  /** Position + movement */
  const [pos, setPos] = useState(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : ORB_SIZE;
    const h = typeof window !== "undefined" ? window.innerHeight : ORB_SIZE;
    return { x: w - ORB_SIZE, y: h - ORB_SIZE };
  });
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: clamp(p.x, 0, window.innerWidth - ORB_SIZE),
        y: clamp(p.y, 0, window.innerHeight - ORB_SIZE),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const pressRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const moveRafRef = useRef<number | null>(null);
  const lastMoveRef = useRef<{ x: number; y: number } | null>(null);
  const hoverIdRef = useRef<string | null>(null);

  /** Drawer + chat state */
  const [open, setOpen] = useState(false);
  const [mic, setMic] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<AssistantMessage[]>([]);
  const [toast, setToast] = useState("");
  const [interim, setInterim] = useState("");

  /** Context post, updated by feed hover/selection */
  const [ctxPost, setCtxPost] = useState<Post | null>(null);
  useEffect(() => {
    const offHover = bus.on("feed:hover", (p: { post: Post }) => setCtxPost(p.post));
    const offFocus = bus.on("post:focus", (p: { id: string | number }) => {
      // could fetch and pin; for now just keep state
    });
    return () => { offHover?.(); offFocus?.(); };
  }, []);

  /** Drag + hold-to-talk handlers */
  function onDown(e: React.PointerEvent<HTMLButtonElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pressRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    movedRef.current = false;
    holdTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      startListening();
    }, 280);
  }
  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!pressRef.current) return;
    lastMoveRef.current = { x: e.clientX, y: e.clientY };
    if (moveRafRef.current !== null) return;
    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = null;
      if (!pressRef.current || !lastMoveRef.current) return;
      const { x: cx, y: cy } = lastMoveRef.current;
      const dx = cx - pressRef.current.x;
      const dy = cy - pressRef.current.y;
      if (!movedRef.current && Math.hypot(dx, dy) < 5) return;
      movedRef.current = true;
      if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      const nx = clamp(cx - ORB_RADIUS, 0, window.innerWidth - ORB_SIZE);
      const ny = clamp(cy - ORB_RADIUS, 0, window.innerHeight - ORB_SIZE);
      setPos({ x: nx, y: ny });

      // highlight post under cursor while dragging
      const el = document.elementFromPoint(cx, cy) as HTMLElement | null;
      const target = el?.closest?.("[data-post-id]") as HTMLElement | null;
      const id = target?.dataset.postId || null;
      if (id !== hoverIdRef.current) {
        if (hoverIdRef.current) {
          document.querySelector(`[data-post-id="${hoverIdRef.current}"]`)?.classList.remove("pc-target");
        }
        hoverIdRef.current = id;
        if (id && target) {
          target.classList.add("pc-target");
          bus.emit("feed:select-id", { id });
        }
      }
    });
  }
  function onUp(e: React.PointerEvent<HTMLButtonElement>) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (moveRafRef.current !== null) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null; }
    lastMoveRef.current = null;
    const dragged = movedRef.current;
    pressRef.current = null;
    movedRef.current = false;

    const hovered = hoverIdRef.current;
    if (hovered) {
      document.querySelector(`[data-post-id="${hovered}"]`)?.classList.remove("pc-target");
      hoverIdRef.current = null;
    }

    if (mic && suppressClickRef.current) {
      stopListening();
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const target = el?.closest?.("[data-post-id]") as HTMLElement | null;
      if (dragged && target) {
        const id = target.dataset.postId!;
        bus.emit("post:focus", { id });
        setToast(`🎯 linked to ${id}`);
        setTimeout(() => setToast(""), 1100);
      }
      setTimeout(() => (suppressClickRef.current = false), 0);
    }
  }
  function onClick() {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    setOpen(v => !v);
  }

  /** Voice Recognition */
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const restartRef = useRef(false);
  function ensureRec(): SpeechRecognitionLike | null {
    if (recRef.current) return recRef.current;
    const C = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!C) { setToast("Voice not supported"); return null; }
    const rec = new C();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onstart = () => setToast("Listening…");
    rec.onend = () => { setToast(""); if (restartRef.current) { try { rec.start(); } catch {} } };
    rec.onerror = () => setToast("Mic error");
    rec.onresult = async (e: any) => {
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) tmp += r[0]?.transcript || "";
      }
      if (tmp) setInterim(tmp.trim());
      const finals = Array.from(e.results).filter((r: any) => r.isFinal).map((r: any) => r?.[0]?.transcript || "");
      const final = finals.join(" ").trim();
      if (!final) return;
      setInterim("");
      handleCommand(final);
    };
    recRef.current = rec;
    return rec;
  }
  function startListening(){ const r = ensureRec(); if (!r) return; restartRef.current = true; try { r.start(); } catch {} setMic(true); }
  function stopListening(){ restartRef.current = false; try { recRef.current?.stop(); } catch {} setMic(false); setInterim(""); }

  /** Commands */
  async function handleCommand(text: string) {
    const post = ctxPost || null;
    const push = (m: AssistantMessage) => setMsgs((s) => [...s, m]);

    push({ id: crypto.randomUUID(), role: "user", text, ts: Date.now(), postId: (post?.id as any) });

    const T = text.trim();
    const lower = T.toLowerCase();

    // react command
    if (lower.startsWith("/react")) {
      const emoji = T.replace("/react", "").trim() || "❤️";
      if (post) {
        bus.emit("post:react", { id: post.id, emoji });
        push({ id: crypto.randomUUID(), role: "assistant", text: `✨ Reacted ${emoji} on ${post.id}`, ts: Date.now(), postId: (post.id as any) });
      } else {
        push({ id: crypto.randomUUID(), role: "assistant", text: `⚠️ No post selected. Drag the orb over a post.`, ts: Date.now() });
      }
      return;
    }

    // comment command
    if (lower.startsWith("/comment ")) {
      const body = T.slice(9).trim();
      if (post) {
        bus.emit("post:comment", { id: post.id, body });
        push({ id: crypto.randomUUID(), role: "assistant", text: `💬 Commented on ${post.id}: ${body}`, ts: Date.now(), postId: (post.id as any) });
      } else {
        push({ id: crypto.randomUUID(), role: "assistant", text: `⚠️ No post selected.`, ts: Date.now() });
      }
      return;
    }

    // remix command
    if (lower.startsWith("/remix")) {
      // symbolic stub to your backend pipeline
      const media = (post?.images?.[0] || (post as any)?.image || (post as any)?.cover || "/vite.svg") as string;
      const spec: RemixSpec = { kind: "image-to-video", src: media, params: {} };
      bus.emit("post:remix", { id: post?.id, spec }); // hook: backend picks it up
      push({ id: crypto.randomUUID(), role: "assistant", text: `🎬 Remix queued`, ts: Date.now(), postId: (post?.id as any) });
      return;
    }

    // world/portal command
    if (lower.startsWith("/world")) {
      bus.emit("orb:portal", { x: pos.x + ORB_RADIUS, y: pos.y + ORB_RADIUS, post });
      push({ id: crypto.randomUUID(), role: "assistant", text: `🌀 Entering world…`, ts: Date.now(), postId: (post?.id as any) });
      return;
    }

    // search (local/web) — optional stubs
    if (lower.startsWith("/search ")) {
      const q = T.slice(8).trim();
      bus.emit("assistant:search", { q, postId: post?.id });
      push({ id: crypto.randomUUID(), role: "assistant", text: `🔎 Searching: ${q}`, ts: Date.now() });
      return;
    }

    // default: forward to backend assistant
    bus.emit("assistant:ask", { text: T, postId: post?.id });
    push({ id: crypto.randomUUID(), role: "assistant", text: `🤖 Working on it…`, ts: Date.now(), postId: (post?.id as any) });
  }

  /** Emoji list (100+, starts with 🤗 as requested) */
  const EMOJI_LIST = useMemo(() => [
    "🤗","😂","🥵","😅","🤔","🙂","😉","😍","😎","😢","😭","🤣","🥳","🤯","😡","😱","🤭","🙄","🥺","🤪","🤫","🤤",
    "😴","👻","🤖","💀","👽","😈","👋","👍","👎","👏","🙏","👀","💪","🫶","💅","🔥","✨","⚡","💥","❤️","🧡","💛",
    "💚","💙","💜","🖤","🤍","💔","❤️‍🔥","❤️‍🩹","💯","💢","💬","🗯️","🎉","🎊","🎁","🏆","⚽","🎮","🚀","✈️",
    "🚗","🏠","📱","💡","🎵","🎶","📢","📚","📅","📈","✅","❌","❗","❓","‼️","⚠️","🌀","🎬","🦄","🍕","🍔",
    "🍎","🍺","🌈","✏️","🖊️","⚙️","🧩","🫠","🫡","🫨","🤡","🤝","🫰","🤌","🫵","🫂","🧠","🗿","🛰️","🧪","🧨",
  ], []);

  function handleEmojiClick(emoji: string) {
    if (emoji === "🌀") { handleCommand("/world"); return; }
    if (emoji === "🎬") { handleCommand("/remix"); return; }
    // default reaction
    handleCommand(`/react ${emoji}`);
  }

  /** Cleanup timers */
  useEffect(() => {
    return () => {
      if (moveRafRef.current !== null) cancelAnimationFrame(moveRafRef.current);
      if (holdTimerRef.current !== null) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const orbStyle: React.CSSProperties = { left: pos.x, top: pos.y };

  return (
    <>
      <button
        className={`assistant-orb ${mic ? "mic" : ""}`}
        style={orbStyle}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onClick}
        aria-label="Assistant orb"
        title={mic ? "Listening… (click to toggle)" : "Assistant — click to open, hold to talk"}
      >
        <span className="assistant-orb__core" />
        <span className="assistant-orb__ring" />
        {!!toast && <span className="assistant-orb__toast">{toast}</span>}
      </button>

      {open && (
        <div className="assistant-petal">
          <div className="ap-head">
            <div className="ap-dot" />
            <div className="ap-title">
              Assistant
              <div className="ap-sub">
                {ctxPost ? `linked: ${ctxPost.title || ctxPost.author || ctxPost.id}` : "no post context"}
              </div>
            </div>
            <button className="ap-btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          {/* Emoji grid */}
          <div className="ap-emojis">
            {EMOJI_LIST.map((emoji) => (
              <button key={emoji} className="emoji-btn" onClick={() => handleEmojiClick(emoji)}>
                {emoji}
              </button>
            ))}
          </div>

          {/* Conversation */}
          <div className="ap-body">
            {msgs.length === 0 && (
              <div className="ap-hint">
                Try: <code>/search</code> <code>/comment</code> <code>/react ❤️</code> <code>/world</code> <code>/remix</code>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`ap-msg ${m.role}`}>
                <div className="ap-msg-bubble">{m.text}</div>
              </div>
            ))}
            {interim && (
              <div className="ap-msg assistant"><div className="ap-msg-bubble">…{interim}</div></div>
            )}
          </div>

          {/* Input */}
          <form
            className="ap-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim()) return;
              const t = input.trim();
              setInput("");
              handleCommand(t);
            }}
          >
            <input
              className="ap-input"
              placeholder="Type /search /comment /react ❤️ /world /remix"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className={`ap-mic ${mic ? "on" : ""}`}
              type="button"
              onClick={() => (mic ? stopListening() : startListening())}
              aria-label="Mic"
              title={mic ? "Stop listening" : "Start listening"}
            >
              {mic ? "🎙️" : "🎤"}
            </button>
            <button className="ap-send" type="submit" aria-label="Send">➤</button>
          </form>
        </div>
      )}
    </>
  );
}