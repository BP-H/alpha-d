// src/components/ChatDock.tsx
import React, { useRef, useState } from "react";

export default function ChatDock() {
  const [open, setOpen] = useState(true);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  if (!open) {
    return (
      <button
        className="chatdock-pill"
        onClick={() => setOpen(true)}
        aria-label="Open chat"
      >
        Assistant
      </button>
    );
  }
  return (
    <div className="chatdock">
      <div className="chatdock__head">
        <div className="title">Assistant</div>
        <button
          className="x"
          onClick={() => setOpen(false)}
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
      </div>
      <div className="chatdock__body" ref={wrapRef}>
        <div className="bubble system">Hi! This is a layout-only stub.</div>
      </div>
    </div>
  );
}
