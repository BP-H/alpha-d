import { create } from "zustand";
import type { Post } from "../types";

interface FeedState {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
}));

export function usePaginatedPosts(page: number, pageSize: number) {
  return useFeedStore((state) => {
    const p = Math.max(1, Math.floor(page));
    const size = Math.max(1, Math.floor(pageSize));
    const start = (p - 1) * size;
    if (start >= state.posts.length) return [];
    return state.posts.slice(start, start + size);
  });
}
