// src/components/World3D.tsx  (your “better?” version, hardened)
import React, { useEffect, useRef, useState } from "react";

type RGB = { r: number; g: number; b: number };
const rgba = (c: RGB, a = 1) => `rgba(${c.r|0}, ${c.g|0}, ${c.b|0}, ${a})`;

function avgColor(img: HTMLImageElement): RGB | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 24; canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 24, 24);
    const { data } = ctx.getImageData(0, 0, 24, 24);
    let r=0,g=0,b=0,n=0;
    for (let i=0;i<data.length;i+=4) {
      if (data[i+3] < 8) continue;
      r += data[i]; g += data[i+1]; b += data[i+2]; n++;
    }
    if (!n) return null;
    return { r: r/n, g: g/n, b: b/n };
  } catch { return null; }
}

export default function World3D(){
  const [tint, setTint] = useState<RGB>({ r: 40, g: 60, b: 140 });
  const ref = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(".pc-media img"));
    if (!imgs.length) return;
    let raf = 0;
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
      if (!visible.length) return;
      const img = visible[0].target as HTMLImageElement;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { const c = avgColor(img); if (c) setTint(c); });
    }, { threshold: [0,.25,.5,.75,1] });
    imgs.forEach(img => img.complete ? io.observe(img) : img.addEventListener("load", () => io.observe(img), { once:true }));
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  const bg = `radial-gradient(120% 120% at 8% 12%, ${rgba(tint,.35)} 0%, #0f1326 52%, #070a17 100%)`;
  return <div className="world-bg" ref={ref} style={{ background: bg }} />;
}
