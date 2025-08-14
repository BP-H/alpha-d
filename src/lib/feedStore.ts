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
    const start = page * pageSize;
    return state.posts.slice(start, start + pageSize);
  });
}
