// src/components/feed/Feed.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PostCard from "./PostCard";
import bus from "../../lib/bus";
import type { Post } from "../../types";
import { useFeedStore } from "../../lib/feedStore";
import "./Feed.css";

const PAGE = 9;
const PRELOAD_PX = 800;

export default function Feed() {
  const posts = useFeedStore((s) => s.posts);
  const [limit, setLimit] = useState(PAGE);
  const visible = useMemo(() => posts.slice(0, limit), [posts, limit]);
  const ref = useRef<HTMLDivElement | null>(null);

  // infinite scroll
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const near = el.scrollTop + el.clientHeight > el.scrollHeight - PRELOAD_PX;
      if (near && limit < posts.length) setLimit((n) => n + PAGE);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [limit, posts.length]);

  // feed:hover (nearest post around viewport mid) — only if we have posts
  useEffect(() => {
    if (!posts.length) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>(".pc"));
      const cy = window.innerHeight * 0.45;
      let best: { node: HTMLElement; d: number } | null = null;
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        const mid = (r.top + r.bottom) / 2;
        const d = Math.abs(mid - cy);
        if (!best || d < best.d) best = { node: c, d };
      }
      if (best) {
        const id = best.node.dataset.postId!;
        const p = posts.find((pp) => String(pp.id) === id);
        if (p) bus.emit("feed:hover", { post: p, rect: best.node.getBoundingClientRect() });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [posts]);

  return (
    <div ref={ref} className="content-viewport">
      <div className="feed-wrap">
        <div className="feed-content">
          {visible.length ? (
            visible.map((p) => <PostCard key={String(p.id)} post={p} />)
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "60vh",
        color: "var(--ink, #eef2ff)",
        opacity: 0.9,
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>No posts yet</div>
        <div style={{ opacity: 0.8 }}>
          Use the orb to <code>/world</code>, <code>/comment</code>, <code>/react ❤️</code>, or connect your backend and inject
          <br />
          <code>window.__SN_POSTS__ = [/* your posts */]</code>
        </div>
      </div>
    </div>
  );
}
