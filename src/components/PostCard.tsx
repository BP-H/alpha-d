// src/components/PostCard.tsx
import React, { useState } from "react";
import type { Post } from "./feed/Feed";

export default function PostCard({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);

  return (
    <article
      className={`pc post-card ${open ? "dopen" : ""}`}
      data-post-id={post.id}
      aria-label={post.title}
    >
      <div className="pc-media">
        <img src={post.image} alt={post.title} loading="lazy" />

        {/* Frosted top bar */}
        <div className="pc-topbar">
          <div className="pc-ava">
            <img src={post.authorAvatar} alt="" />
          </div>
          <div className="pc-meta">
            <div className="pc-handle">{post.author}</div>
            <div className="pc-sub">{post.time}</div>
          </div>
          <div className="pc-title">{post.title}</div>
        </div>

        {/* Frosted bottom bar */}
        <div className="pc-botbar">
          <div className="pc-actions">
            <button className="pc-act profile" aria-label="Profile">
              <span className="ico" />
              <span>Profile</span>
            </button>
            <button className="pc-act" aria-label="Like">
              <span className="ico heart" />
              <span>Like</span>
            </button>
            <button className="pc-act" aria-label="Comment">
              <span className="ico comment" />
              <span>Comment</span>
            </button>
            <button className="pc-act" aria-label="Share">
              <span className="ico share" />
              <span>Share</span>
            </button>
            <button className="pc-act" aria-label="Save">
              <span className="ico save" />
              <span>Save</span>
            </button>
            <button
              className="pc-act"
              aria-label="More"
              onClick={() => setOpen((s) => !s)}
              title="Toggle drawer"
            >
              <span className="ico world" />
              <span>More</span>
            </button>
          </div>

          {/* Minimal slide drawer: “emoji palette” seed */}
          <div className="pc-drawer">
            <div style={{ padding: 12, display: "grid", gap: 8 }}>
              <div style={{ opacity: 0.9 }}>
                Quick reacts:{" "}
                <span role="img" aria-label="fire">🔥</span>{" "}
                <span role="img" aria-label="sparkles">✨</span>{" "}
                <span role="img" aria-label="heart">❤️</span>{" "}
                <span role="img" aria-label="eyes">👀</span>{" "}
                <span role="img" aria-label="star">⭐</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                (This is intentionally simple; we’ll wire a 100‑emoji drawer and
                menus next without changing the layout.)
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
