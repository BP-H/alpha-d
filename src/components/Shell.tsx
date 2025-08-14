// src/components/Shell.tsx
import React from "react";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";
import PostCard from "./PostCard";
import bus from "../lib/bus";

// Minimal Post shape local to this file (keeps TS happy even if types change elsewhere)
type Post = {
  id: string;
  author: string;
  authorAvatar?: string;
  title?: string;
  time?: string;
  media?: string; // optional img/video url (we'll default to gradient bg)
};

// Simple demo feed (replace with real data later)
const POSTS: Post[] = [
  {
    id: "p1",
    author: "@alfa",
    authorAvatar: "",
    title: "Prototype Moment",
    time: "2m",
    media:
      "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "p2",
    author: "@nova",
    authorAvatar: "",
    title: "Ambient City",
    time: "8m",
    media:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "p3",
    author: "@void",
    authorAvatar: "",
    title: "Night Drive",
    time: "12m",
    media:
      "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function Shell() {
  // Optional: your orb's "fly to portal" animation still works via this
  const onPortal = (post: any, at: { x: number; y: number }) => {
    bus.emit("orb:portal", { post, x: at.x, y: at.y });
  };

  return (
    <>
      {/* Viewport */}
      <div className="content-viewport" style={{ minHeight: "100dvh" }}>
        <main className="feed-wrap" style={{ padding: "8px 0 80px" }}>
          <section className="feed-content" style={{ width: "100%", margin: 0 }}>
            {POSTS.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </section>
        </main>
      </div>

      {/* Orb + chat (always on top) */}
      <AssistantOrb onPortal={onPortal} />
      <ChatDock />
    </>
  );
}
