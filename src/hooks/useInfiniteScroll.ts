import { useEffect, useRef, useState } from "react";

export function useInfiniteScroll<T>(opts: {
  loadMore: () => Promise<T[]>;
  hasMore?: boolean;
  rootMargin?: string;
}) {
  const { loadMore, hasMore = true, rootMargin = "1200px 0px" } = opts;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoadingState] = useState(false);
  const loadingRef = useRef(loading);
  const setLoading = (value: boolean) => {
    loadingRef.current = value;
    setLoadingState(value);
  };
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const io = new IntersectionObserver(async (entries) => {
      const e = entries[0];
      if (!e.isIntersecting || loadingRef.current || !hasMore) return;
      setLoading(true);
      try {
        const next = await loadMore();
        if (!cancelled) {
          setItems((prev) => prev.concat(next));
          setPage((p) => p + 1);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, { rootMargin });
    const node = sentinelRef.current;
    if (node) io.observe(node);
    return () => { cancelled = true; io.disconnect(); };
  }, [loadMore, hasMore, rootMargin]);

  return { items, setItems, page, setPage, loading, error, sentinelRef };
}
