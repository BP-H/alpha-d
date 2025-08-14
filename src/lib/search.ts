// src/lib/search.ts
import type { Post, SearchResult } from "../types";
import { demoPosts } from "./placeholders";

export function localSearchPosts(q: string, posts?: Post[]): SearchResult[] {
  const data = posts?.length ? posts : demoPosts;
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const s = (v?: string) => (v?.toLowerCase().includes(t) ? t.length : 0);
  return data
    .map(p => ({
      id: String(p.id),
      title: p.title || p.author || "post",
      snippet: `${p.author || ""} ${p.title || ""}`.trim(),
      url: `#post-${p.id}`,
      score: s(p.title) + s(p.author) + s(p.location) + s(p.time),
    }))
    .filter(r => (r.score || 0) > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

// Optional: web search via your backend
export async function webSearch(q: string): Promise<SearchResult[]> {
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results || []) as SearchResult[];
  } catch { return []; }
}
