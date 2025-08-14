// src/lib/placeholders.ts
export const ME = {
  id: "me",
  name: "You",
  handle: "@you",
  avatar: "/avatar.jpg",
} as const;

export const me = ME;
export const currentUser = ME;

export const demoPosts = [
  {
    id: "p-01",
    author: "@orbital",
    authorAvatar: "/avatar.jpg",
    title: "Glassy postcards over a living world",
    time: "2m",
    images: ["/vite.svg"],
  },
  {
    id: "p-02",
    author: "@nova",
    authorAvatar: "/avatar.jpg",
    title: "Scroll the void",
    time: "12m",
    images: ["/vite.svg"],
  },
  {
    id: "p-03",
    author: "@studio",
    authorAvatar: "/avatar.jpg",
    title: "XR ready",
    time: "1h",
    images: ["/vite.svg"],
  },
];
