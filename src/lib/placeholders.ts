// src/lib/placeholders.ts
import type { Post } from "../types";

/**
 * Demo posts OFF by default.
 * Re-enable locally by setting Vercel env: VITE_DEMO=1
 */
const USE_DEMO = (import.meta as any)?.env?.VITE_DEMO === "1";

export const demoPosts: Post[] = USE_DEMO
  ? [
      {
        id: "p-01",
        author: "@orbital",
        authorAvatar: "/avatar.jpg",
        title: "Glassy postcards over a living world",
        time: "2m",
        images: ["/vite.svg"],
        location: "superNova",
      },
      {
        id: "p-02",
        author: "@nova",
        authorAvatar: "/avatar.jpg",
        title: "Scroll the void",
        time: "12m",
        images: ["/vite.svg"],
        location: "superNova",
      },
      {
        id: "p-03",
        author: "@studio",
        authorAvatar: "/avatar.jpg",
        title: "XR ready",
        time: "1h",
        images: ["/vite.svg"],
        location: "superNova",
      },
      {
        id: "p-04",
        author: "@cosmos",
        authorAvatar: "/avatar.jpg",
        title: "Signals from deep space",
        time: "2h",
        images: ["/vite.svg"],
        location: "superNova",
      },
      {
        id: "p-05",
        author: "@nebula",
        authorAvatar: "/avatar.jpg",
        title: "Painting the dark matter",
        time: "5h",
        images: ["/vite.svg"],
        location: "superNova",
      },
    ]
  : [];
