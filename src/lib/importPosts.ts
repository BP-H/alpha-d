import type { Post } from "../types";
import { useFeedStore } from "./feedStore";

/**
 * Fetch posts from an external API using the provided auth token.
 * This uses jsonplaceholder.typicode.com as a stand-in external service.
 */
export async function fetchExternalPosts(token: string): Promise<Post[]> {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts?userId=1", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return (data as any[]).map((p) => ({
    id: `ext-${p.id}`,
    title: p.title,
    author: `user-${p.userId ?? "external"}`,
    image: "/vite.svg",
  }));
}

/**
 * Fetch posts from the external service and prepend them to the feed store.
 */
export async function importExternalPosts(token: string) {
  const posts = await fetchExternalPosts(token);
  const current = useFeedStore.getState().posts;
  useFeedStore.getState().setPosts([...posts, ...current]);
}

