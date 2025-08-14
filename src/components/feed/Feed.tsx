import React, { useEffect, useMemo, useRef, useState } from "react";
import PostCard from "./PostCard";
import { demoPosts } from "../../lib/placeholders";
import bus from "../../lib/bus";
import type { Post } from "../../types";

const PAGE = 9;
const PRELOAD_PX = 800;

export default function Feed(){
  const posts: Post[] = demoPosts; // hook your store later
  const [limit, setLimit] = useState(PAGE);
  const visible = useMemo(() => posts.slice(0, limit), [posts, limit]);
  const ref = useRef<HTMLDivElement|null>(null);

  // infinite scroll
  useEffect(() => {
    const el = ref.current!; if (!el) return;
    const onScroll = () => {
      const near = el.scrollTop + el.clientHeight > el.scrollHeight - PRELOAD_PX;
      if (near && limit < posts.length) setLimit(n => n + PAGE);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [limit, posts.length]);

  // feed:hover (nearest post under viewport center)
  useEffect(() => {
    const el = ref.current!; if (!el) return;
    let raf = 0;
    const tick = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>(".pc"));
      const cy = window.innerHeight * 0.45;
      let best: { node: HTMLElement, d: number } | null = null;
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        const mid = (r.top + r.bottom) / 2;
        const d = Math.abs(mid - cy);
        if (!best || d < best.d) best = { node: c, d };
      }
      if (best) {
        const id = best.node.dataset.postId!;
        const idx = posts.findIndex(p => String(p.id) === id);
        if (idx >= 0) bus.emit("feed:hover", { post: posts[idx], rect: best.node.getBoundingClientRect() });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [posts]);

  return (
    <div ref={ref} className="content-viewport" style={{ height: "100%", overflow: "auto", paddingBottom: 80 }}>
      <div style={{ display:"grid", gap:12 }}>
        {visible.map((p, i) => <PostCard key={`${p.id}-${i}`} post={p} />)}
      </div>
    </div>
  );
}
