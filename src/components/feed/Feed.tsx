import { useEffect, useMemo, useRef, useState } from "react";
import PostCard from "./PostCard";
import { useFeedStore } from "../../lib/feedStore";
import "./Feed.css";

const PAGE_SIZE = 9;
const PRELOAD_THRESHOLD_PX = 800;

export default function Feed() {
  // Tolerant to different store shapes (posts / allPosts / items)
  const posts = useFeedStore((s: any) => s.allPosts ?? s.posts ?? s.items ?? []) as any[];

  const [limit, setLimit] = useState(PAGE_SIZE);
  const visible = useMemo(() => posts.slice(0, limit), [posts, limit]);

  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight > el.scrollHeight - PRELOAD_THRESHOLD_PX;
      if (nearBottom && limit < posts.length) {
        setLimit((n) => n + PAGE_SIZE);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // prime once in case content is short
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [posts.length, limit]);

  return (
    <div ref={parentRef} className="content-viewport feed-wrap">
      <div className="feed-content">
        {visible.map((post, i) => (
          <div key={(post?.id ?? i) + "-" + i} style={{ position: "relative" }}>
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
