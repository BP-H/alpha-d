// src/lib/placeholders.ts
import type { Post, User } from "../types";

export const ME: User = {
  id: "me",
  name: "You",
  handle: "@you",
  avatar: "/avatar.jpg",
} as any;

export const me = ME;
export const currentUser = ME;

export const demoPosts: Post[] = [
  {
    id: "p-01",
    author: "@orbital",
    authorAvatar: "/avatar.jpg",
    title: "Glassy postcard over a living world",
    time: "2m",
    images: ["/vite.svg"],
  } as any,
  {
    id: "p-02",
    author: "@nova",
    authorAvatar: "/avatar.jpg",
    title: "Scroll the void",
    time: "12m",
    images: ["/vite.svg"],
  } as any,
  {
    id: "p-03",
    author: "@studio",
    authorAvatar: "/avatar.jpg",
    title: "XR ready",
    time: "1h",
    images: ["/vite.svg"],
  } as any,
];
