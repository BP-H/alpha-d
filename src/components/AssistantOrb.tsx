// src/components/AssistantOrb.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AssistantOrb.css";
import bus from "../lib/bus";
import { askLLM, imageToVideo } from "../lib/assistant";
import { localSearchPosts, webSearch } from "../lib/search";
import type { AssistantMessage, Post, RemixSpec } from "../types";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type SpeechRecognitionLike = any;

function clamp(n: number, a: number, b: number){ return Math.min(b, Math.max(a, n)); }

export default function AssistantOrb(){
  // --- dock position (draggable)
  const [pos, setPos] = useState(() => ({ x: window.innerWidth - 76, y: window.innerHeight - 76 }));
  const pressRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  // --- chat state
  const [open, setOpen] = useState(false);
  const [mic, setMic] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<AssistantMessage[]>([]);
  const [toast, setToast] = useState("");
  const [listeningInterim, setInterim] = useState("");

  // --- current post context (nearest/hover)
  const [ctxPost, setCtxPost] = useState<Post | null>(null);

  // Speech recognition
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const restartRef = useRef(false);

  // nearest post while dragging / hovered
  const nearestPostRef = useRef<Post | null>(null);

  // watch hovered post from feed
  useEffect(() => bus.on("feed:hover", (p: { post: Post; rect: DOMRect }) => setCtxPost(p.post)), []);

  // --- Dragging
  function onDown(e: React.PointerEvent<HTMLButtonElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pressRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    movedRef.current = false;
    // hold to talk
    holdTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      startListening();
    }, 280) as unknown as number;
  }
  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!pressRef.current) return;
    const dx = e.clientX - pressRef.current.x;
    const dy = e.clientY - pressRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) < 5) return;
    movedRef.current = true;
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    const nx = clamp(e.clientX - 38, 0, window.innerWidth - 76);
    const ny = clamp(e.clientY - 38, 0, window.innerHeight - 76);
    setPos({ x: nx, y: ny });

    // highlight nearest post under pointer
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const target = el?.closest?.("[data-post-id]") as HTMLElement | null;
    if (target) {
      target.classList.add("pc-target");
      setTimeout(() => target.classList.remove("pc-target"), 120);
      const id = target.dataset.postId!;
      bus.emit("feed:select-id", { id });
    }
  }
  function onUp(e: React.PointerEvent<HTMLButtonElement>) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    const dragged = movedRef.current;
    pressRef.current = null; movedRef.current = false;

    // if we were holding to talk, stop listening on release
    if (mic && suppressClickRef.current) {
      stopListening();
      // lock to post if released over one
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const target = el?.closest?.("[data-post-id]") as HTMLElement | null;
      if (dragged && target) {
        const id = target.dataset.postId!;
        bus.emit("post:focus", { id });
        setToast(`🎯 linked to ${id}`);
        setTimeout(()=>setToast(""), 1100);
      }
      setTimeout(() => (suppressClickRef.current = false), 0);
    }
  }
  function onClick() {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    setOpen(v => !v); // open the petal; mic is separate
  }

  // --- Mic
  function ensureRec(): SpeechRecognitionLike | null {
    if (recRef.current) return recRef.current;
    const C = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!C) { setToast("Voice not supported"); return null; }
    const rec = new C();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onstart = () => { listeningRef.current = true; setToast("Listening…"); };
    rec.onend = () => { listeningRef.current = false; setToast(mic ? "…" : ""); if (restartRef.current && !speakingRef.current) { try { rec.start(); } catch {} } };
    rec.onerror = () => setToast("Mic error");
    rec.onresult = async (e: any) => {
      // interim
      let interim = "";
      for (let i=e.resultIndex; i<e.results.length; i++){ const r = e.results[i]; if (!r.isFinal) interim += r[0]?.transcript || ""; }
      if (interim) setInterim(interim.trim());

      // final
      const finals = Array.from(e.results as any).filter((r:any)=>r.isFinal).map((r:any)=>r?.[0]?.transcript||"");
      const final = finals.join(" ").trim();
      if (!final) return;
      setInterim("");
      handleCommand(final);
    };
    recRef.current = rec;
    return rec;
  }
  async function startListening(){
    const rec = ensureRec(); if (!rec) return;
    restartRef.current = true; try { rec.start(); } catch {}
    setMic(true);
  }
  function stopListening(){
    restartRef.current = false; try { recRef.current?.stop(); } catch {}
    setMic(false); setInterim(""); setToast("");
  }

  // --- Command parser
  async function handleCommand(text: string){
    const post = ctxPost || nearestPostRef.current || null;
    const push = (m: AssistantMessage) => setMsgs(s => [...s, m]);

    // Show user message
    push({ id: crypto.randomUUID(), role:"user", text, ts:Date.now(), postId: post?.id as any });

    const T = text.trim();
    const lower = T.toLowerCase();

    // /search
    if (lower.startsWith("/search ")) {
      const q = T.slice(8).trim();
      const local = localSearchPosts(q);
      push({ id: crypto.randomUUID(), role:"assistant", text: `🔎 Local results (${local.length}):\n` + local.map(r => `• ${r.title}`).join("\n"), ts: Date.now() });
      // optional web search via backend
      const web = await webSearch(q);
      if (web.length) push({ id: crypto.randomUUID(), role:"assistant", text: `🌐 Web results (${web.length}):\n` + web.slice(0,5).map(r => `• ${r.title}`).join("\n"), ts: Date.now() });
      return;
    }

    // /comment
    if (lower.startsWith("/comment ")) {
      const body = T.slice(9).trim();
      if (post) {
        bus.emit("post:comment", { id: post.id, body });
        push({ id: crypto.randomUUID(), role:"assistant", text: `💬 Commented on ${post.id}: ${body}`, ts: Date.now(), postId: post.id as any });
      } else {
        push({ id: crypto.randomUUID(), role:"assistant", text: `⚠️ No post selected. Drag the orb over a post and release to link.`, ts: Date.now() });
      }
      return;
    }

    // /react ❤️
    if (lower.startsWith("/react")) {
      const emoji = T.replace("/react","").trim() || "❤️";
      if (post) {
        bus.emit("post:react", { id: post.id, emoji });
        push({ id: crypto.randomUUID(), role:"assistant", text: `✨ Reacted ${emoji} on ${post.id}`, ts: Date.now(), postId: post.id as any });
      } else {
        push({ id: crypto.randomUUID(), role:"assistant", text: `⚠️ No post selected.`, ts: Date.now() });
      }
      return;
    }

    // /world
    if (lower.startsWith("/world")) {
      bus.emit("orb:portal", { post: post || { id:"void", title:"Portal" }, x: pos.x, y: pos.y });
      push({ id: crypto.randomUUID(), role:"assistant", text: `🌀 Entering world…`, ts: Date.now(), postId: post?.id as any });
      return;
    }

    // /remix image→video (stub)
    if (lower.startsWith("/remix")) {
      const spec: RemixSpec = { kind:"image-to-video", src: (post?.images?.[0] || post?.image || post?.cover) || "/vite.svg" };
      const r = await imageToVideo(spec);
      push({ id: crypto.randomUUID(), role:"assistant", text: r.ok ? `🎬 Remix queued: ${r.url}` : `❌ Remix failed: ${r.error}`, ts: Date.now() });
      return;
    }

    // default: ask LLM
    const ans = await askLLM(T, { post });
    push(ans);
  }

  // submit text
  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    await handleCommand(t);
  }

  // style helpers
  const style: React.CSSProperties = { left: pos.x, top: pos.y };

  return (
    <>
      {/* Floating orb */}
      <button
        className={`assistant-orb ${mic ? "mic" : ""}`}
        style={style}
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

      {/* Petal chat (in-orb search & commands) */}
      {open && (
        <div className="assistant-petal" style={{ left: pos.x - 280 + 64, top: pos.y - 260 }}>
          <div className="ap-head">
            <div className="ap-dot" style={{ background: "radial-gradient(120% 120% at 30% 30%, #fff, #ffc6f3 60%, #ff74de)" }} />
            <div className="ap-title">
              Assistant
              <div className="ap-sub">
                {ctxPost ? `linked: ${ctxPost.title || ctxPost.author || ctxPost.id}` : "no post context"}
              </div>
            </div>
            <button className="ap-btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="ap-body">
            {msgs.length === 0 && (
              <div className="ap-hint">
                Try commands: <code>/search</code> <code>/comment</code> <code>/react ❤️</code> <code>/world</code> <code>/remix</code>
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} className={`ap-msg ${m.role}`}>
                <div className="ap-msg-bubble">{m.text}</div>
              </div>
            ))}
            {listeningInterim && <div className="ap-msg assistant"><div className="ap-msg-bubble">…{listeningInterim}</div></div>}
          </div>

          <form className="ap-form" onSubmit={onSubmit}>
            <input
              className="ap-input"
              placeholder="Type here — /search /comment /react ❤️ /world /remix"
              value={input} onChange={e => setInput(e.target.value)}
            />
            <button className={`ap-mic ${mic ? "on":""}`} type="button" onClick={() => (mic ? stopListening() : startListening())} aria-label="Mic">
              {mic ? "🎙️" : "🎤"}
            </button>
            <button className="ap-send" type="submit" aria-label="Send">➤</button>
          </form>
        </div>
      )}
    </>
  );
}
