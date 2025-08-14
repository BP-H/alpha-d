// src/components/feed/Feed.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Post } from "../../types";
import { useFeedStore } from "../../lib/feedStore";
import PostCard from "./PostCard";
import "./feed.css";

const PAGE_SIZE = 9;
const PRELOAD_THRESHOLD_PX = 800;

export default function Feed() {
  const { allPosts } = useFeedStore(); // your store
  const [page, setPage] = useState(0);

  const visible = useMemo(
    () => allPosts.slice(0, Math.min(allPosts.length, (page + 1) * PAGE_SIZE)),
    [allPosts, page]
  );

  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 560, // rough; real size measured below
    // Accurate measuring for mixed-height posts:
    measureElement: (el) => (el as HTMLElement).getBoundingClientRect().height,
    overscan: 3,
  });

  // Load next page when close to the bottom
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight > el.scrollHeight - PRELOAD_THRESHOLD_PX;
      if (nearBottom && visible.length < allPosts.length) {
        setPage((p) => p + 1);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // prime once
    return () => el.removeEventListener("scroll", onScroll);
  }, [allPosts.length, visible.length]);

  return (
    <div ref={parentRef} className="content-viewport feed-wrap">
      <div className="feed-content" style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const post = visible[vi.index] as Post;
          return (
            <div
              key={String(post.id) + "-" + vi.index}
              ref={rowVirtualizer.measureElement}
              data-index={vi.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {/* Only pass the props PostCard expects */}
              <PostCard post={post} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
