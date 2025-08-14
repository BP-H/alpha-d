// src/components/World3D.tsx
import React, { useEffect, useRef } from "react";

type RGB = { r: number; g: number; b: number };
const clamp = (v: number, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));
const toRGBA = (c: RGB, a = 0.35) => `rgba(${c.r | 0}, ${c.g | 0}, ${c.b | 0}, ${a})`;

/** Basic lerp for smooth transitions */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  // inputs 0..255 -> outputs h(0..1), s(0..1), l(0..1)
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

/** Saturation- and midtone-biased "dominant" color */
function sampleTint(img: HTMLImageElement, sample = 24): RGB | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = sample; canvas.height = sample;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    // Draw scaled down – cheap and robust
    ctx.drawImage(img, 0, 0, sample, sample);
    const { data } = ctx.getImageData(0, 0, sample, sample);

    let wSum = 0, rSum = 0, gSum = 0, bSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 10) continue; // ignore transparent

      const r = data[i], g = data[i + 1], b = data[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);

      // downweight near-black/near-white; emphasize saturated midtones
      const lWeight = Math.max(0, 1 - Math.abs(l - 0.5) * 2.2); // 0 @ extremes, ~1 near mid
      const weight = (s * s) * (lWeight);                         // square s for punch

      if (weight <= 0.0005) continue;

      wSum += weight;
      rSum += r * weight;
      gSum += g * weight;
      bSum += b * weight;
    }

    if (wSum > 0) {
      return { r: rSum / wSum, g: gSum / wSum, b: bSum / wSum };
    }

    // Fallback to flat average if weighting found nothing interesting
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 10) continue;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return n ? { r: r / n, g: g / n, b: b / n } : null;
  } catch {
    // CORS-tainted canvas or other issue – ignore gracefully
    return null;
  }
}

/** Score visible entries: intersection + center bias */
function scoreEntry(entry: IntersectionObserverEntry) {
  const ir = entry.intersectionRatio;
  const rect = (entry.target as Element).getBoundingClientRect();
  const cx = (rect.left + rect.right) / 2;
  const cy = (rect.top + rect.bottom) / 2;
  const vw = window.innerWidth, vh = window.innerHeight;
  const dx = (cx - vw / 2) / vw, dy = (cy - vh / 2) / vh;
  const dist = Math.hypot(dx, dy);          // 0 = center
  return ir - dist * 0.25;                  // tune center weight
}

export default function World3D() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<RGB>({ r: 40, g: 60, b: 140 });
  const targetRef = useRef<RGB>({ r: 40, g: 60, b: 140 });
  const animRef = useRef<number | null>(null);

  // smoothly approach target tint; only animates when needed
  const ensureAnim = () => {
    if (animRef.current != null) return;
    const step = () => {
      const c = currentRef.current;
      const t = targetRef.current;
      // Exponential smoothing per frame (tune 0.12..0.2)
      const k = 0.14;
      const nr = lerp(c.r, t.r, k);
      const ng = lerp(c.g, t.g, k);
      const nb = lerp(c.b, t.b, k);

      const done =
        Math.abs(nr - t.r) < 0.5 &&
        Math.abs(ng - t.g) < 0.5 &&
        Math.abs(nb - t.b) < 0.5;

      currentRef.current = { r: nr, g: ng, b: nb };

      const el = hostRef.current;
      if (el) el.style.setProperty("--tint", toRGBA(currentRef.current, 0.35));

      if (!done) {
        animRef.current = requestAnimationFrame(step);
      } else {
        // snap & stop loop
        currentRef.current = { ...t };
        if (el) el.style.setProperty("--tint", toRGBA(t, 0.35));
        animRef.current && cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const images = new Set<HTMLImageElement>();
    let raf = 0;

    const observer = new IntersectionObserver((entries) => {
      // Pick the "best" visible image
      const visible = entries.filter(e => e.isIntersecting);
      if (!visible.length) return;

      visible.sort((a, b) => scoreEntry(b) - scoreEntry(a));
      const topImg = visible[0].target as HTMLImageElement;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const c = sampleTint(topImg);
        if (c) {
          // clamp defensively
          targetRef.current = { r: clamp(c.r), g: clamp(c.g), b: clamp(c.b) };
          ensureAnim();
        }
      });
    }, { root: null, threshold: [0, 0.25, 0.5, 0.75, 1] });

    // Helper to attach an <img> once it's ready
    const attach = (img: HTMLImageElement) => {
      if (images.has(img)) return;
      images.add(img);
      if (img.complete) observer.observe(img);
      else img.addEventListener("load", () => observer.observe(img), { once: true });
    };

    // Observe existing .pc-media images
    document.querySelectorAll<HTMLImageElement>(".pc-media img").forEach(attach);

    // Also observe images that arrive later (infinite scroll)
    const feed = document.querySelector(".feed-content") || document.body;
    const mo = new MutationObserver((muts) => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches?.(".pc-media img")) attach(node as HTMLImageElement);
          node.querySelectorAll?.(".pc-media img").forEach(el => attach(el as HTMLImageElement));
        });
      });
    });
    mo.observe(feed, { childList: true, subtree: true });

    // Listen for manual tints: window.dispatchEvent(new CustomEvent('world:tint', { detail: {r,g,b} }))
    const onTint = (e: Event) => {
      const detail = (e as CustomEvent).detail as RGB | undefined;
      if (!detail) return;
      targetRef.current = { r: clamp(detail.r), g: clamp(detail.g), b: clamp(detail.b) };
      ensureAnim();
    };
    window.addEventListener("world:tint", onTint as EventListener);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      mo.disconnect();
      window.removeEventListener("world:tint", onTint as EventListener);
      if (animRef.current != null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, []);

  // Initial paint: set a CSS var so no React re-render is needed later
  useEffect(() => {
    const el = hostRef.current;
    if (el) el.style.setProperty("--tint", toRGBA(currentRef.current, 0.35));
  }, []);

  return <div ref={hostRef} className="world-bg" aria-hidden="true" />;
}
