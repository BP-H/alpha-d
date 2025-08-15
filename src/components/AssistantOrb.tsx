// src/components/AssistantOrb.tsx
import React, { useEffect, useRef, useState } from "react";
import bus from "../lib/bus";
import type { AssistantMessage, Post } from "../types";

/**
 * AssistantOrb.tsx
 * Improved Assistant Orb - smoother animations and better performance.
 *
 * This file replaces the previous AssistantOrb with performance optimizations.
 */

/* Small helpful types for SpeechRecognition (loose) */
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
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export default function AssistantOrb() {
  // ---------- position state (top-left coords) ----------
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    return {
      x: Math.max(ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN),
      y: Math.max(ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN),
    };
  });

  // keep pos within bounds on resize
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

  // ---------- refs for dragging logic ----------
  const pressRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const movedRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoverIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);

  // ---------- chat + mic state ----------
  const [open, setOpen] = useState(false);
  const [mic, setMic] = useState(false);
  const [interim, setInterim] = useState("");
  const [toast, setToast] = useState("");
  const [msgs, setMsgs] = useState<AssistantMessage[]>([]);
  const [ctxPost, setCtxPost] = useState<Post | null>(null);
  const [dragging, setDragging] = useState(false);

  // subscribe to context (feed hover/select)
  useEffect(() => {
    const unsub1 = bus.on?.("feed:hover", (p: { post: Post }) => setCtxPost(p.post));
    const unsub2 = bus.on?.("feed:select", (p: { post: Post }) => setCtxPost(p.post));
    return () => {
      try { unsub1?.(); } catch {}
      try { unsub2?.(); } catch {}
    };
  }, []);

  // ---------- speech recognition refs ----------
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const restartRef = useRef(false);

  function ensureRec(): SpeechRecognitionLike | null {
    if (recRef.current) return recRef.current;
    const C = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
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
        try { rec.start && rec.start(); } catch {}
      }
    };
    rec.onerror = () => {
      setMic(false);
      setToast("Mic error");
    };
    rec.onresult = (e: any) => {
      // build interim & final transcripts
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
    try { r.start && r.start(); } catch (e) { setToast("Mic error"); setMic(false); }
  }
  function stopListening() {
    restartRef.current = false;
    try { recRef.current?.stop && recRef.current.stop(); } catch {}
    setMic(false);
    setInterim("");
  }

  // ---------- command handler (simplified) ----------
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
        push({ id: crypto.randomUUID(), role: "assistant", text: `✨ Reacted ${emoji} on ${post.id}`, ts: Date.now(), postId: (post.id as any) });
      } else {
        push({ id: crypto.randomUUID(), role: "assistant", text: `⚠️ No post selected. Drag the orb over a post.`, ts: Date.now() });
      }
      return;
    }

    // fallback reply stub
    push({ id: crypto.randomUUID(), role: "assistant", text: `🤖 I heard: "${T}" (stub)`, ts: Date.now() });
  }

  // ---------- helpers for hover highlight ----------
  function setHoverTargetId(id: string | null) {
    // clear previous
    if (hoverIdRef.current) {
      document.querySelector(`[data-post-id="${hoverIdRef.current}"]`)?.classList.remove("pc-target");
      hoverIdRef.current = null;
    }
    if (id) {
      const target = document.querySelector(`[data-post-id="${id}"]`) as HTMLElement | null;
      if (target) {
        target.classList.add("pc-target");
        hoverIdRef.current = id;
      }
    }
  }

  // ---------- core pointer handlers ----------
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // capture pointer
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    const offsetX = e.clientX - pos.x;
    const offsetY = e.clientY - pos.y;
    pressRef.current = { pointerId: e.pointerId, offsetX, offsetY };
    movedRef.current = false;
    suppressClickRef.current = false;
    setDragging(true);
    // hold-to-talk
    if (holdTimerRef.current !== null) { window.clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    holdTimerRef.current = window.setTimeout(() => {
      // if held long enough, start listening and mark so a click is suppressed
      suppressClickRef.current = true;
      startListening();
    }, 280);
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
      const nx = clamp(cur.x - pr.offsetX, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerWidth - ORB_SIZE - ORB_MARGIN));
      const ny = clamp(cur.y - pr.offsetY, ORB_MARGIN, Math.max(ORB_MARGIN, window.innerHeight - ORB_SIZE - ORB_MARGIN));
      const dx = Math.abs(nx - pos.x);
      const dy = Math.abs(ny - pos.y);
      if (!movedRef.current && Math.hypot(dx, dy) < 4) return;
      movedRef.current = true;
      // cancel hold-to-talk if we start dragging
      if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      setPos({ x: nx, y: ny });

      // highlight post under pointer
      const el = document.elementFromPoint(cur.x, cur.y) as HTMLElement | null;
      const target = el?.closest?.("[data-post-id]") as HTMLElement | null;
      const id = target?.dataset.postId || null;
      if (id !== hoverIdRef.current) {
        setHoverTargetId(id);
        if (id) bus.emit?.("feed:select-id", { id });
      }
    });
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLButtonElement>) {
    // common cleanup for up/cancel/lostcapture
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (moveRafRef.current !== null) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null; }
    lastPointerRef.current = null;

    const dragged = movedRef.current;
    movedRef.current = false;
    pressRef.current = null;

    // if microphoned and a suppressed click (i.e. we started listening via hold) -> stop listening and link to post if dragged
    if (mic && suppressClickRef.current) {
      stopListening();
      // attempt to link to a post under pointer
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const target = el?.closest?.("[data-post-id]") as HTMLElement | null;
      if (dragged && target) {
        const id = target.dataset.postId!;
        bus.emit("post:focus", { id });
        setToast(`🎯 linked to ${id}`);
        window.setTimeout(() => setToast(""), 1100);
      }
    } else {
      // if not a mic-suppressed flow and we dragged, just persist pos (already set by onMove)
      if (!dragged) {
        // click occurred (if not suppressed)
      }
    }

    // clear hover highlight
    setDragging(false);
    setHoverTargetId(null);

    // reset suppressClick in next frame (safer)
    requestAnimationFrame(() => { suppressClickRef.current = false; });
  }

  function onClick(e?: React.MouseEvent) {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    setOpen((v) => !v);
  }

  // bind pointercancel & lostcapture to same handler
  // (handlers will be attached to the button element below)

  // ---------- unmount cleanup ----------
  useEffect(() => {
    return () => {
      // stop recognition & prevent restarts
      restartRef.current = false;
      try { recRef.current?.stop && recRef.current.stop(); } catch {}
      recRef.current = null;
      // clear any timers/raf
      if (holdTimerRef.current !== null) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      if (moveRafRef.current !== null) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null; }
      // clear hover markers
      setHoverTargetId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sideClass = (pos.x + ORB_RADIUS) > (window.innerWidth / 2) ? 'left' : 'right';
  const panelW = typeof window !== 'undefined' ? Math.min(320, window.innerWidth * 0.4) : 320;
  const panelLeft = Math.min(pos.x + ORB_SIZE + 8, (window.innerWidth || 0) - ORB_MARGIN - panelW);
  const panelTop = pos.y < (window.innerHeight || 0) * 0.25
    ? pos.y + ORB_SIZE + 8
    : Math.max(ORB_MARGIN, pos.y - 160);

  // ---------- render ----------
  return (
    <>
      <button
        aria-label="Assistant orb"
        title="Assistant — hold to talk, drag to react"
        className={`assistant-orb${mic ? " mic" : ""}${dragging ? " flying" : ""}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        onClick={onClick}>
        <div className="assistant-orb__core" />
        {/* tiny mic ring (visual) */}
        <div className="assistant-orb__ring" />
      </button>

      {/* toast + interim transcripts */}
      {toast && <div className={`assistant-orb__toast ${sideClass}`}>{toast}</div>}
      {interim && <div className={`assistant-orb__toast ${sideClass} interim`}>{interim}</div>}

      {/* simple expand panel when open — minimal inline UI */}
      {open && <div className="assistant-panel" style={{ left: panelLeft, top: panelTop }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Assistant</div>
          <div style={{ fontSize: 13, color: "var(--muted, #bfc6d8)" }}>
            {msgs.length ? msgs[msgs.length - 1].text : "Hi — hold to speak or type below."}
          </div>
          <div style={{ height: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { startListening(); setToast("Listening…"); }}
              style={{ flex: 1, height: 36, borderRadius: 8, border: "none", background: "#ff74de", color: "#111", fontWeight: 700 }}
            >
              🎤 Speak
            </button>
            <button
              onClick={() => { stopListening(); setToast(""); }}
              style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "#fff" }}
            >
              ✖
            </button>
          </div>
        </div>}
    </>
  );
}
