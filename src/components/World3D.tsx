// src/components/World3D.tsx
import React, { useEffect, useRef, useState } from "react";

type RGB = { r: number; g: number; b: number };
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function avgColor(img: HTMLImageElement): RGB | null {
  try {
    const cvs = document.createElement("canvas");
    cvs.width = 24;
    cvs.height = 24;
    const ctx = cvs.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 24, 24);
    const { data } = ctx.getImageData(0, 0, 24, 24);
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (!n) return null;
    return { r: r / n, g: g / n, b: b / n };
  } catch {
    return null;
  }
}

export default function World3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tint, setTint] = useState<RGB>({ r: 124, g: 131, b: 255 });

  // pick tint from visible post image (if any)
  useEffect(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(".pc-media img"));
    if (!imgs.length) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!vis.length) return;
        const img = vis[0].target as HTMLImageElement;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const c = avgColor(img);
          if (c) setTint(c);
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    imgs.forEach((img) => (img.complete ? io.observe(img) : img.addEventListener("load", () => io.observe(img), { once: true })));
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  // starfield renderer (2D canvas with 3D projection)
  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      cvs.width = Math.floor(w * DPR);
      cvs.height = Math.floor(h * DPR);
      cvs.style.width = `${w}px`;
      cvs.style.height = `${h}px`;
    }
    resize();
    window.addEventListener("resize", resize);

    // stars
    type Star = { x: number; y: number; z: number };
    const stars: Star[] = [];
    const cap = clamp(Math.floor((cvs.width * cvs.height) / (900 * DPR)), 600, 1800);

    function spawn(): Star {
      return {
        x: (Math.random() * 2 - 1) * cvs.width,
        y: (Math.random() * 2 - 1) * cvs.height,
        z: Math.random() * 1 + 0.2,
      };
    }
    for (let i = 0; i < cap; i++) stars.push(spawn());

    let raf = 0;
    const centerX = () => cvs.width / 2;
    const centerY = () => cvs.height / 2;
    const focal = () => Math.min(cvs.width, cvs.height) * 0.6;

    // mouse parallax → yaw/pitch
    let yaw = 0,
      pitch = 0,
      tyaw = 0,
      tpitch = 0;
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      tyaw = nx * 0.25;
      tpitch = ny * -0.25;
    };
    window.addEventListener("pointermove", onMove);

    function tick() {
      yaw += (tyaw - yaw) * 0.05;
      pitch += (tpitch - pitch) * 0.05;

      // base
      ctx.fillStyle = "rgba(7,9,15,0.9)";
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      // subtle tint fog
      const cx = centerX();
      const cy = centerY();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cx, cy));
      g.addColorStop(0, `rgba(${tint.r | 0}, ${tint.g | 0}, ${tint.b | 0}, 0.09)`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      // stars
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const f = focal();
      const speed = 0.0035;

      for (let i = 0; i < stars.length; i++) {
        let { x, y, z } = stars[i];
        z -= speed;
        if (z <= 0.05) {
          // recycle star
          stars[i] = spawn();
          ({ x, y, z } = stars[i]);
        }

        // rotate around Z (yaw) then X (pitch) for a soft parallax
        let rx = x * cosY - y * sinY;
        let ry = x * sinY + y * cosY;
        let rz = z;
        const ry2 = ry * cosP - rz * sinP;
        const rz2 = ry * sinP + rz * cosP;

        const sx = cx + (rx / rz2) * f;
        const sy = cy + (ry2 / rz2) * f;
        const alpha = Math.min(1, Math.max(0.12, 1 - z + 0.05));
        const size = Math.max(1, (1 - z) * 3 * DPR);

        // star color slightly biased toward tint (but brightened)
        const cr = 200 + (tint.r - 200) * 0.4;
        const cg = 200 + (tint.g - 200) * 0.4;
        const cb = 200 + (tint.b - 200) * 0.4;
        ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();

        stars[i].z = z;
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, [tint.r, tint.g, tint.b]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
