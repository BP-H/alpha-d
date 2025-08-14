// src/components/PortalOverlay.tsx  (fires the white-burst using your CSS)
import React, { useEffect, useRef, useState } from "react";
import bus from "../lib/bus";

export default function PortalOverlay(){
  const ref = useRef<HTMLDivElement|null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    return bus.on("orb:portal", ({ x, y }: { x: number; y: number }) => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--px", `${x}px`);
      el.style.setProperty("--py", `${y}px`);
      setOn(true);
      window.setTimeout(() => setOn(false), 700);
    });
  }, []);

  return <div ref={ref} className={`portal-overlay${on ? " on": ""}`} />;
}
