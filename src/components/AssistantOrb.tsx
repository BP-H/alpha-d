import React, { useEffect, useRef, useState } from "react";
import bus from "../lib/bus";
import type { AssistantMessage, Post } from "../types";

declare global {
  interface Window { webkitSpeechRecognition?: any; SpeechRecognition?: any; }
}

const ORB_SIZE = 76;
const ORB_RADIUS = ORB_SIZE / 2;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/** Minimal stubs so we don't add new deps — wire these to your backend later */
async function askLLMStub(text: string, _ctx?: any): Promise<AssistantMessage> {
  return { id: crypto.randomUUID(), role: "assistant", text: `🤖 (stub) ${text}`, ts: Date.now() };
}
async function imageToVideoStub(): Promise<{ ok: boolean; url?: string; error?: string }> {
  return { ok: false, error: "Remix backend not connected" };
}

export default function AssistantOrb() {
  // position state for draggable orb
  const [pos, setPos] = useState(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : ORB_SIZE;
    const h = typeof window !== "undefined" ? window.innerHeight : ORB_SIZE;
    return { x: w - ORB_SIZE, y: h - ORB_SIZE };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setPos(p => ({
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

  // chat state
  const [open, setOpen] = useState(false);
  const [mic, setMic] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<AssistantMessage[]>([]);
  const [toast, setToast] = useState("");
  const [interim, setInterim] = useState("");

  // context post (for linking reactions/comments to a specific post)
  const [ctxPost, setCtxPost] = useState<Post | null>(null);
  useEffect(() => {
    const off1 = bus.on?.("feed:hover", (p: { post: Post }) => setCtxPost(p.post));
    const off2 = bus.on?.("feed:select", (p: { post: Post }) => setCtxPost(p.post));
    return () => { off1?.(); off2?.(); };
  }, []);

  useEffect(() => {
    return () => {
      if (moveRafRef.current !== null) cancelAnimationFrame(moveRafRef.current);
      if (holdTimerRef.current !== null) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // Drag + hold-to-talk
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
      // highlight post under pointer
      const el = document.elementFromPoint(cx, cy) as HTMLElement | null;
      const target = el?.closest?.("[data-post-id]") as HTMLElement | null;
      const id = target?.dataset.postId || null;
      if (id !== hoverIdRef.current) {
        if (hoverIdRef.current) {
          document.querySelector(`[data-post-id="${hoverIdRef.current}"]`)
            ?.classList.remove("pc-target");
        }
        hoverIdRef.current = id;
        if (id && target) {
          target.classList.add("pc-target");
          bus.emit?.("feed:select-id", { id });
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
        bus.emit?.("post:focus", { id });
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

  // Speech recognition (optional)
  const recRef = useRef<any | null>(null);
  const restartRef = useRef(false);
  function ensureRec(): any | null {
    if (recRef.current) return recRef.current;
    const C = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!C) { setToast("Voice not supported"); return null; }
    const rec = new C();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
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
      const finals = Array.from(e.results).filter((r: any) => r.isFinal)
                      .map((r: any) => r?.[0]?.transcript || "");
      const final = finals.join(" ").trim();
      if (!final) return;
      setInterim("");
      handleCommand(final);
    };
    recRef.current = rec;
    return rec;
  }
  function startListening() { const r = ensureRec(); if (!r) return; restartRef.current = true; try { r.start(); } catch {} setMic(true); }
  function stopListening() { restartRef.current = false; try { recRef.current?.stop(); } catch {} setMic(false); setInterim(""); }

  // Commands
  async function handleCommand(text: string) {
    const post = ctxPost || null;
    const push = (m: AssistantMessage) => setMsgs(s => [...s, m]);
    push({ id: crypto.randomUUID(), role: "user", text, ts: Date.now(), postId: post?.id as any });

    const T = text.trim();
    const lower = T.toLowerCase();

    if (lower.startsWith("/comment ")) {
      const body = T.slice(9).trim();
      if (post) {
        bus.emit?.("post:comment", { id: post.id, body });
        push({ id: crypto.randomUUID(), role: "assistant", text: `💬 Commented: ${body}`, ts: Date.now(), postId: post.id as any });
      } else {
        push({ id: crypto.randomUUID(), role: "assistant", text: `⚠️ No post selected. Drag the orb over a post to link.`, ts: Date.now() });
      }
      return;
    }

    if (lower.startsWith("/react")) {
      const emoji = T.replace("/react", "").trim() || "❤️";
      if (post) {
        bus.emit?.("post:react", { id: post.id, emoji });
        push({ id: crypto.randomUUID(), role: "assistant", text: `✨ Reacted ${emoji}`, ts: Date.now(), postId: post.id as any });
      } else {
        push({ id: crypto.randomUUID(), role: "assistant", text: `⚠️ No post selected.`, ts: Date.now() });
      }
      return;
    }

    if (lower.startsWith("/world")) {
      bus.emit?.("orb:portal", { post: post || { id: "void" }, x: pos.x, y: pos.y });
      push({ id: crypto.randomUUID(), role: "assistant", text: `🌀 Entering world…`, ts: Date.now(), postId: post?.id as any });
      return;
    }

    if (lower.startsWith("/remix")) {
      const r = await imageToVideoStub();
      push({ id: crypto.randomUUID(), role: "assistant", text: r.ok ? `🎬 Remix queued: ${r.url}` : `❌ Remix failed: ${r.error}`, ts: Date.now() });
      return;
    }

    // Default: stubbed LLM
    const ans = await askLLMStub(T, { post });
    push(ans);
  }

  const EMOJI_LIST = [
    "😂","🥵","😅","🤔","🙂","😉","😍","😎","😢","😭","🤣","🥳","🤯","😡","😱","🤗","🤭","🙄","🥺","🤪","🤫","🤤",
    "😴","👻","🤖","💀","👽","😈","👋","👍","👎","👏","🙏","👀","💪","🫶","💅","🔥","✨","⚡","💥","❤️","🧡","💛",
    "💚","💙","💜","🖤","🤍","💔","❤️‍🔥","❤️‍🩹","💯","💢","💬","🗯️","🎉","🎊","🎁","🏆","🚀","✅","❌","❗","❓",
    "⚠️","🎮","🎶","📈","🧠","🗿","🍕","🍔","🌈","🦄","🌀","🎬"
  ];
  function handleEmojiClick(emoji: string) {
    if (emoji === "🌀") handleCommand("/world");
    else if (emoji === "🎬") handleCommand("/remix");
    else handleCommand(`/react ${emoji}`);
  }

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
        title={mic ? "Listening… (click to toggle)" : "Assistant — click to open chat, hold to talk"}
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

          <div className="ap-emojis">
            {EMOJI_LIST.map(emoji => (
              <button key={emoji} className="emoji-btn" onClick={() => handleEmojiClick(emoji)}>
                {emoji}
              </button>
            ))}
          </div>

          <div className="ap-body">
            {msgs.length === 0 && (
              <div className="ap-hint">
                Try: <code>/comment hi</code> <code>/react ❤️</code> <code>/world</code> <code>/remix</code>
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} className={`ap-msg ${m.role}`}>
                <div className="ap-msg-bubble">{m.text}</div>
              </div>
            ))}
            {interim && (
              <div className="ap-msg assistant">
                <div className="ap-msg-bubble">…{interim}</div>
              </div>
            )}
          </div>

          <form className="ap-form" onSubmit={async e => { e.preventDefault(); if (!input.trim()) return; const t = input.trim(); setInput(""); await handleCommand(t); }}>
            <input
              className="ap-input"
              placeholder="Type /comment /react ❤️ /world /remix"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button className={`ap-mic ${mic ? "on" : ""}`} type="button" onClick={() => (mic ? stopListening() : startListening())} aria-label="Mic">
              {mic ? "🎙️" : "🎤"}
            </button>
            <button className="ap-send" type="submit" aria-label="Send">➤</button>
          </form>
        </div>
      )}

      {/* CSS injected locally to avoid touching global styles */}
      <style>{`
:root{ --orb-size: 76px; --pink:#ff74de; --blue:#4f7afe; }

/* Assistant Orb (hot pink) */
.assistant-orb{
  position:fixed; z-index:75; width:var(--orb-size); height:var(--orb-size); border-radius:50%;
  border:1px solid rgba(255,255,255,.12); overflow:hidden;
  transform:translate(-50%,-50%); left:${pos.x}px; top:${pos.y}px;
  transition:left .16s ease, top .16s ease, box-shadow .2s ease, filter .2s ease;
  display:grid; place-items:center; cursor:grab;
  background: radial-gradient(120% 120% at 30% 30%, #fff, #ffd7f5 60%, var(--pink));
  box-shadow: 0 12px 30px rgba(0,0,0,.35), 0 0 0 8px color-mix(in srgb, var(--pink) 20%, transparent);
}
.assistant-orb.mic{
  box-shadow: 0 12px 30px rgba(0,0,0,.35), 0 0 0 10px color-mix(in srgb, var(--pink) 28%, transparent);
}
.assistant-orb__core{
  width:56px; height:56px; border-radius:50%;
  background: radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,.95), rgba(255,255,255,.28) 65%, transparent 70%);
}
.assistant-orb__ring{ position:absolute; inset:-4px; border-radius:50%; box-shadow: inset 0 0 24px rgba(255,255,255,.55); }
.assistant-orb:hover{ filter:saturate(115%) }
.assistant-orb.mic .assistant-orb__ring{ animation: orb-ping 1.4s ease-out infinite }
@keyframes orb-ping{ 0%{ box-shadow:0 0 0 0 color-mix(in srgb, var(--pink) 28%, transparent);} 100%{ box-shadow:0 0 0 28px rgba(0,0,0,0);} }
.assistant-orb__toast{
  position:absolute; right:72px; top:50%; transform:translateY(-50%);
  white-space:nowrap; padding:6px 8px; border-radius:8px;
  background: rgba(0,0,0,.65); color:#fff; font-size:12px;
  box-shadow: 0 8px 20px rgba(0,0,0,.25); pointer-events:none;
}

/* Petal (drawer) */
.assistant-petal {
  position: fixed; z-index: 76; width: min(680px, 92vw); max-height: 80vh;
  display: flex; flex-direction: column;
  bottom: 0; left: 50%; transform: translateX(-50%);
  background: rgba(26,28,38,.6);
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 16px;
  backdrop-filter: blur(18px) saturate(180%);
  box-shadow: 0 18px 48px rgba(0,0,0,.45); overflow: hidden;
  animation: petalIn .4s ease-out;
}
@keyframes petalIn { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

.ap-head { display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.12); }
.ap-dot {
  width:22px; height:22px; border-radius: 999px;
  border:1px solid rgba(255,255,255,.2);
  box-shadow:0 0 0 4px color-mix(in srgb, var(--pink) 20%, transparent);
  background: radial-gradient(120% 120% at 30% 30%, #fff, #ffc6f3 60%, var(--pink));
}
.ap-title { font-weight:800; }
.ap-sub { font-size:12px; opacity:.8; }
.ap-btn { margin-left:auto; background: rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); color:#fff; height:28px; padding:0 10px; border-radius:8px; cursor:pointer; }

.ap-body { padding:10px 12px; overflow:auto; display:flex; flex-direction:column; gap:8px; max-height:280px; }
.ap-hint { opacity:.8; }
.ap-msg { display:flex; }
.ap-msg.user { justify-content:flex-end; }
.ap-msg-bubble {
  max-width: 78%;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.16);
  padding: 8px 10px; border-radius:12px;
}
.ap-msg.user .ap-msg-bubble { background: rgba(255,255,255,.14); }

.ap-form { display:flex; gap:8px; padding:10px 12px; border-top:1px solid rgba(255,255,255,.12); }
.ap-input {
  flex:1; height:36px; padding:0 10px; border-radius:10px; outline:0;
  background: rgba(16,18,28,.65); border:1px solid rgba(255,255,255,.16); color:#fff;
}
.ap-mic, .ap-send {
  height:36px; padding:0 10px; border-radius:10px; border:1px solid rgba(255,255,255,.16);
  background: rgba(255,255,255,.08); color:#fff; cursor:pointer;
}
.ap-mic.on { box-shadow: 0 0 0 3px color-mix(in srgb, var(--pink) 25%, transparent) inset; }

/* Emoji grid */
.ap-emojis { display:flex; flex-wrap:wrap; gap:8px; padding:10px 12px; max-height:200px; overflow-y:auto; }
.emoji-btn { background:none; border:none; font-size:24px; cursor:pointer; padding:4px; border-radius:6px; transition: transform .1s ease, background .1s ease; }
.emoji-btn:hover { background: rgba(255,255,255,.1); transform: scale(1.1); }
      `}</style>
    </>
  );
}
