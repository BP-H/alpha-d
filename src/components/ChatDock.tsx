// src/components/ChatDock.tsx
import { useEffect, useRef, useState } from "react";
import bus from "../lib/bus";

type Msg = { role: "user" | "assistant" | "system"; text: string };

export default function ChatDock() {
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const off = bus.on?.("chat:add", (m: Msg) => {
      setMsgs((prev) => [...prev.slice(-9), m]); // keep last 10
      queueMicrotask(() => {
        const el = wrapRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
    return () => {
      try { off?.(); } catch {}
    };
  }, []);

  if (!open) {
    return (
      <button className="chatdock-pill" onClick={() => setOpen(true)} aria-label="Open chat">
        Chat
      </button>
    );
  }
  return (
    <div className="chatdock">
      <div className="chatdock__head">
        <div className="title">Assistant</div>
        <button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </div>
      <div className="chatdock__body" ref={wrapRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
        ))}
      </div>
    </div>
  );
}
