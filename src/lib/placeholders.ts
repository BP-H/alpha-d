// src/lib/placeholders.ts
import type { Post, User } from "../types";

export const ME: User = {
  id: "me",
  name: "You",
  handle: "@you",
  avatar: "/vite.svg",
} as any;

export const me = ME;
export const currentUser = ME;

export const demoPosts: Post[] = [
  {
    id: "p-01",
    author: "@orbital",
    authorAvatar: "/vite.svg",
    title: "Glass + World",
    time: "2m",
    images: ["/vite.svg"],
  } as any,
  {
    id: "p-02",
    author: "@nova",
    authorAvatar: "/vite.svg",
    title: "Scroll the void",
    time: "12m",
    images: ["/vite.svg"],
  } as any,
  {
    id: "p-03",
    author: "@studio",
    authorAvatar: "/vite.svg",
    title: "XR ready",
    time: "1h",
    images: ["/vite.svg"],
  } as any,
];
