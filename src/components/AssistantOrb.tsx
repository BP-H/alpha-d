// src/components/AssistantOrb.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import bus from "../lib/bus";
import type { Post } from "../types";
import type { WorldState } from "../lib/world";
import { assistantReply } from "../lib/api";

/** Only declare speech recognition (built-in TTS types already exist). */
declare global { interface Window { webkitSpeechRecognition?: any; SpeechRecognition?: any; } }
type SpeechRecognitionLike = any;

const FLY_MS = 600;

// Fill broad fields so it matches either of your Post shapes safely.
const defaultPost: Post = {
  // @ts-ignore - tolerate either string/number
  id: "void",
  // @ts-ignore
  author: "@proto_ai",
  // @ts-ignore
  authorAvatar: "",
  // @ts-ignore
  title: "Prototype",
  // @ts-ignore
  time: "now",
  // @ts-ignore
  image: "",
  // @ts-ignore
  images: [],
} as unknown as Post;

function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }

// ---- color helpers for the pink ↔ blue tint mapping
function hexToRgb(hex: string) {
  const s = hex.replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map(ch => ch + ch).join("") : s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
}
function mixHex(a: string, b: string, t: number) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return rgbToHex(m(A.r, B.r), m(A.g, B.g), m(A.b, B.b));
}
function withAlpha(hex: string, alpha = 0.6) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---- local intents (kept & extended)
function parseLocalIntent(t: string, prev: Partial<WorldState>) {
  const patch: Partial<WorldState> = {};
  let action: "portal" | "leave" | null = null;
  let message: string | null = null;

  t = t.toLowerCase();

  if ((/enter|open/.test(t)) && /(world|portal|void)/.test(t)) { action = "portal"; message = "Entering world"; }
  if ((/leave|exit|back/.test(t)) && /(world|portal|feed|void)/.test(t)) { action = "leave"; message = "Back to feed"; }

  if (/dark(er)?/.test(t)) { patch.theme = "dark"; message = "Dark mode"; }
  if (/light|bright(er)?/.test(t)) { patch.theme = "light"; message = "Light mode"; }

  if (/(hide|turn off) grid/.test(t)) { patch.gridOpacity = 0; message = "Grid off"; }
  if (/(show|turn on) grid/.test(t)) { patch.gridOpacity = 0.18; message = "Grid on"; }

  if (/(more|increase) fog/.test(t)) { patch.fogLevel = clamp((prev.fogLevel ?? .5) + 0.15, 0, 1); message = "More fog"; }
  if (/(less|decrease|clear) fog/.test(t)) { patch.fogLevel = clamp((prev.fogLevel ?? .5) - 0.15, 0, 1); message = "Less fog"; }

  const mCount = t.match(/(?:set )?(?:orbs?|people) to (\d{1,2})/);
  if (mCount) { patch.orbCount = clamp(parseInt(mCount[1], 10), 1, 64); message = `Orbs ${patch.orbCount}`; }
  if (/(more|add) (?:orbs?|people)/.test(t)) { patch.orbCount = clamp((prev.orbCount ?? 14) + 4, 1, 64); message = `Orbs ${patch.orbCount}`; }
  if (/(less|fewer|remove) (?:orbs?|people)/.test(t)) { patch.orbCount = clamp((prev.orbCount ?? 14) - 4, 1, 64); message = `Orbs ${patch.orbCount}`; }

  const named: Record<string,string> = {
    red:"#ef4444", blue:"#3b82f6", teal:"#14b8a6", cyan:"#06b6d4",
    green:"#22c55e", orange:"#f97316", white:"#ffffff", black:"#111827"
  };
  const hex = t.match(/#([0-9a-f]{3,6})/);
  const cname = Object.keys(named).find(k => t.includes(`${k} orb`) || t.includes(`${k} sphere`) || t.includes(`${k} color`));
  if (hex) { patch.orbColor = "#"+hex[1]; message = "Orb color updated"; }
  else if (cname) { patch.orbColor = named[cname]; message = `Orbs ${cname}`; }

  return { patch, action, message };
}

// Speak and resolve when speech ends; pause recognition while speaking to avoid echo.
function speak(text: string, onBefore?: () => void, onAfter?: () => void): Promise<void> {
  return new Promise((resolve) => {
    try {
      const synth = (window as any).speechSynthesis;
      const Utter = (window as any).SpeechSynthesisUtterance;
      if (!synth || !Utter) return resolve();
      synth.cancel();
      const u = new Utter(text);
      const pick = synth.getVoices?.().find((v: any) => v?.lang?.startsWith?.("en"));
      if (pick) u.voice = pick;
      u.rate = 1; u.pitch = 1; u.lang = "en-US";
      u.onstart = () => { onBefore?.(); };
      u.onend = () => { onAfter?.(); resolve(); };
      synth.speak(u);
    } catch { resolve(); }
  });
}

async function ensureMicPermission(): Promise<boolean> {
  try {
    const anyNav = navigator as any;
    if (anyNav?.permissions?.query) {
      const st = await anyNav.permissions.query({ name: "microphone" as any });
      if (st.state === "denied") return false;
      if (st.state === "granted") return true;
    }
  } catch {}
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch { return false; }
}

export default function AssistantOrb({
  onPortal = () => {},
  hidden = false,
}: {
  onPortal?: (post: Post, at: { x: number; y: number }) => void;
  hidden?: boolean;
}) {
  // --- docking / position
  const dock = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const x = window.innerWidth - 76, y = window.innerHeight - 76;
    dock.current = { x, y }; return { x, y };
  });

  // drag/hold state
  const pressRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);

  // --- voice & world context
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const restartOnEndRef = useRef(false);
  const speakingRef = useRef(false);
  const worldRef = useRef<Partial<WorldState>>({});
  const lastHoverRef = useRef<{ post: Post; x: number; y: number } | null>(null);

  const [micOn, setMicOn] = useState(false);
  const [toast, setToast] = useState("");
  const [flying, setFlying] = useState(false);

  // dynamic tint based on screen corner (top-left → pink, bottom-right → blue)
  const tint = useMemo(() => {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const nx = clamp(pos.x / w, 0, 1), ny = clamp(pos.y / h, 0, 1);
    const t = (nx + ny) / 2;                   // 0 = TL, 1 = BR
    return mixHex("#ff74de", "#3b82f6", t);    // pink → blue
  }, [pos.x, pos.y]);

  // keep dock in bottom-right on resize
  useEffect(() => {
    const onR = () => {
      const x = window.innerWidth - 76, y = window.innerHeight - 76;
      dock.current = { x, y }; if (!flying) setPos({ x, y });
    };
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [flying]);

  // bus hooks: feed hover + world snapshot
  useEffect(() => bus.on("feed:hover", (p) => (lastHoverRef.current = p)), []);
  useEffect(() => bus.on("world:remember", (s) => (worldRef.current = { ...worldRef.current, ...s })), []);

  // mic control over the bus (XR or other agents)
  useEffect(() => bus.on("orb:mic", ({ on }: { on: boolean }) => (on ? startListening() : stopListening())), []);
  useEffect(() => { bus.emit("orb:mic-state", { on: micOn }); }, [micOn]);

  // portal flight
  useEffect(() => {
    return bus.on("orb:portal", (payload: { post: Post; x: number; y: number }) => {
      setFlying(true); setPos({ x: payload.x, y: payload.y });
      window.setTimeout(() => {
        onPortal(payload.post, { x: payload.x, y: payload.y });
        setPos({ ...dock.current });
        window.setTimeout(() => setFlying(false), 350);
      }, FLY_MS);
    });
  }, [onPortal]);

  // recognizer
  useEffect(() => {
    const Ctor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Ctor) {
      setToast("Voice not supported");
      bus.emit("chat:add", { role: "system", text: "Voice not supported in this browser." });
      return;
    }
    const rec: SpeechRecognitionLike = new Ctor();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => { listeningRef.current = true; setToast("Listening…"); };
    rec.onerror = () => { setToast("Mic error"); };
    rec.onend = () => {
      listeningRef.current = false;
      setToast(micOn ? "…" : "");
      if (restartOnEndRef.current && !speakingRef.current) {
        try { rec.start(); } catch {}
      }
    };

    rec.onresult = async (e: any) => {
      // interim
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) interim += (r[0]?.transcript || "");
      }
      if (interim) setToast(`…${interim.trim()}`);

      // final
      const final = Array.from(e.results as any)
        .filter((r: any) => r.isFinal)
        .map((r: any) => r?.[0]?.transcript || "")
        .join(" ")
        .trim();
      if (!final) return;

      bus.emit("chat:add", { role: "user", text: final });
      setToast(`Heard: “${final}”`);

      const { patch, action, message } = parseLocalIntent(final, worldRef.current);

      if (patch && Object.keys(patch).length) {
        worldRef.current = { ...worldRef.current, ...patch };
        bus.emit("world:update", patch);
      }
      if (action === "portal") {
        const target = lastHoverRef.current ?? { post: defaultPost, x: window.innerWidth - 56, y: window.innerHeight - 56 };
        bus.emit("orb:portal", target);
      }
      if (action === "leave") bus.emit("ui:leave", {});

      // model reply (only if not purely local)
      const isPureLocal = !!(message || action || (patch && Object.keys(patch).length));
      let reply = isPureLocal ? (message || "Done.") : "";
      if (!isPureLocal) {
        const r = await assistantReply(final);
        reply = r.ok ? (r.text || "Done.") : (r.error || "Failed.");
      }

      // Pause recognition during speech, then resume.
      const recNow = recRef.current;
      const stopIfListening = () => { try { if (listeningRef.current) recNow?.stop(); } catch {} };
      const maybeRestart = () => { if (micOn) { restartOnEndRef.current = true; /* onend handler restarts */ } };

      speakingRef.current = true;
      await speak(reply, stopIfListening, () => { speakingRef.current = false; maybeRestart(); });

      bus.emit("chat:add", { role: "assistant", text: reply });
      setToast(reply);
      window.setTimeout(() => setToast(""), 1600);
    };

    return () => { try { rec.stop(); } catch {} };
  }, [micOn]);

  async function startListening() {
    const ok = await ensureMicPermission();
    if (!ok) {
      setToast("Mic blocked — allow in site settings");
      bus.emit("chat:add", { role: "system", text: "Microphone blocked. Click the padlock → allow microphone." });
      return;
    }
    const rec = recRef.current; if (!rec) return;
    restartOnEndRef.current = true;
    try { rec.start(); setMicOn(true); } catch {}
  }
  function stopListening() {
    const rec = recRef.current; restartOnEndRef.current = false;
    try { rec?.stop(); } catch {}
    setMicOn(false); setToast("");
  }
  const toggleMic = () => { if (micOn) stopListening(); else startListening(); };

  // drag + hold-to-talk
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (flying) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pressRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    movedRef.current = false;

    // long-press to talk (press-and-hold)
    holdTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = true;
      startListening();
    }, 300) as unknown as number;
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!pressRef.current) return;
    const dx = e.clientX - pressRef.current.x;
    const dy = e.clientY - pressRef.current.y;
    const moved = Math.hypot(dx, dy) > 5;
    if (!moved && movedRef.current === false) return;

    movedRef.current = true;
    if (holdTimerRef.current) { window.clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }

    const w = window.innerWidth, h = window.innerHeight;
    const nx = clamp(e.clientX - 38, 0, w - 76);
    const ny = clamp(e.clientY - 38, 0, h - 76);
    setPos({ x: nx, y: ny });
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (holdTimerRef.current) { window.clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    const wasDrag = movedRef.current;
    pressRef.current = null; movedRef.current = false;

    // if we held-to-speak, stop on release
    if (micOn && suppressNextClickRef.current) {
      stopListening();
      // if we actually dragged, try to lock-on to a target under pointer (DOM-based)
      if (wasDrag) {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const t = el?.closest?.("[data-post-id],[data-target-id]") as HTMLElement | null;
        if (t) {
          const id = t.dataset.postId || t.dataset.targetId || "unknown";
          bus.emit("target:locked", { id, kind: t.dataset.kind || "post" });
          setToast(`Locked on ${id}`);
          window.setTimeout(() => setToast(""), 1200);
        }
      }
      // ensure the click handler below does not toggle mic
      setTimeout(() => { suppressNextClickRef.current = false; }, 0);
    }
  }

  function onClick() {
    if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
    toggleMic();
  }

  // styles
  const style = useMemo(
    () => ({ left: pos.x + "px", top: pos.y + "px", display: hidden ? "none" : undefined, touchAction: "none" as const }),
    [pos, hidden]
  );
  const coreStyle = useMemo(() => ({
    background: tint,
    boxShadow: `0 0 0 8px ${withAlpha(tint, 0.18)}, 0 8px 28px ${withAlpha(tint, 0.4)}`
  }), [tint]);
  const ringStyle = useMemo(() => ({
    boxShadow: `0 0 28px ${withAlpha(tint, 0.65)} inset, 0 0 1px ${withAlpha("#000000", 0.4)}`
  }), [tint]);

  return (
    <button
      className={`assistant-orb ${micOn ? "mic" : ""} ${flying ? "flying" : ""}`}
      style={style}
      aria-label="Assistant"
      title={micOn ? "Listening… (click to stop)" : "Assistant (click or hold to talk)"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
    >
      <span className="assistant-orb__core" style={coreStyle} />
      <span className="assistant-orb__ring" style={ringStyle} />
      {toast && <span className="assistant-orb__toast" role="status" aria-live="polite">{toast}</span>}
    </button>
  );
}
