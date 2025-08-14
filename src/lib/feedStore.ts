import { create } from "zustand";
import type { Post } from "../types";
import { demoPosts } from "./placeholders";

const injected =
  typeof window !== "undefined"
    ? ((window as any).__SN_POSTS__ as Post[] | undefined)
    : undefined;

const initialPosts = Array.isArray(injected) && injected.length
  ? injected
  : demoPosts;

interface FeedState {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: initialPosts,
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((s) => ({ posts: [post, ...s.posts] })),
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
