// src/components/feed/Feed.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Post, User } from "../../types";
import PostCard from "../PostCard";
import { useFeedStore } from "../../lib/feedStore";
import "./Feed.css"; // ← correct path: same folder as this file

type Props = {
  me: User;
  onOpenProfile?: (id: string) => void;
  onEnterWorld: () => void;
};

const PAGE_SIZE = 50;
const PRELOAD_THRESHOLD_PX = 800;

export default function Feed({ me, onOpenProfile, onEnterWorld }: Props) {
  const allPosts = useFeedStore((s) => s.posts);
  const [page, setPage] = useState(0);

  const visiblePosts = useMemo(
    () => allPosts.slice(0, Math.min(allPosts.length, (page + 1) * PAGE_SIZE)),
    [allPosts, page]
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: visiblePosts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 500, // initial estimate; real size is measured below
    overscan: 6,
    // (Optional) custom measurer for accuracy if posts vary a lot in height:
    measureElement: (el) => (el as HTMLElement).getBoundingClientRect().height,
  });

  // Increment page when the user nears the bottom
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - PRELOAD_THRESHOLD_PX;

      if (nearBottom && visiblePosts.length < allPosts.length) {
        setPage((p) => p + 1);
      }
    };

    // Prime once (in case the viewport is tall)
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [allPosts.length, visiblePosts.length]);

  return (
    <div ref={parentRef} className="content-viewport feed-wrap">
      <div
        className="feed-content"
        style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
      >
        {rowVirtualizer.getVirtualItems().map((vr) => {
          const post = visiblePosts[vr.index] as Post;
          return (
            <div
              key={post.id}
              data-index={vr.index}
              // safer ref callback than passing the method directly
              ref={(el) => {
                if (el) rowVirtualizer.measureElement(el);
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vr.start}px)`,
                paddingBottom: "var(--post-gap)",
              }}
            >
              <PostCard
                post={post}
                me={me}
                onOpenProfile={onOpenProfile}
                onEnterWorld={onEnterWorld}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
