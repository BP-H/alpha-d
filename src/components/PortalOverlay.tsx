// src/components/PortalOverlay.tsx  (fires the white-burst using your CSS)
import React, { useEffect, useRef, useState } from "react";
import bus from "../lib/bus";

export default function PortalOverlay(){
  const ref = useRef<HTMLDivElement|null>(null);
  const [on, setOn] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const off = bus.on("orb:portal", ({ x, y }: { x: number; y: number }) => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--px", `${x}px`);
      el.style.setProperty("--py", `${y}px`);
      setOn(true);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setOn(false);
        timerRef.current = null;
      }, 700);
    });
    return () => {
      off();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return <div ref={ref} className={`portal-overlay${on ? " on": ""}`} />;
}
