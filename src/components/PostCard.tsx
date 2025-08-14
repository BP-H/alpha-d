// src/components/PostCard.tsx
import React, { useState } from "react";
import "./feed/postcard.css"; // loads the glassy styles

type Post = {
  id: string;
  author: string;
  authorAvatar?: string;
  title?: string;
  time?: string;
  media?: string;
};

export default function PostCard({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);

  return (
    <article
      className={`pc post-card ${open ? "dopen" : ""}`}
      data-post-id={post.id}
      aria-label={post.title || post.author}
    >
      {/* Media */}
      <div className="pc-media post-media">
        {post.media ? (
          <img
            src={post.media}
            alt={post.title || "media"}
            style={{ width: "100vw", height: "auto", objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              width: "100vw",
              height: "62dvh",
              background:
                "radial-gradient(120% 120% at 30% 30%, #111827, #0b0d12 60%, #0b0d12)",
            }}
          />
        )}
      </div>

      {/* Frosted top bar: avatar + meta + title */}
      <div className="pc-topbar frost-top">
        <div className="pc-ava" aria-hidden>
          {post.authorAvatar ? (
            <img src={post.authorAvatar} alt="" />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background:
                  "radial-gradient(120% 120% at 30% 30%, #fff, #c7d2fe 60%, #7c83ff)",
              }}
            />
          )}
        </div>
        <div className="pc-meta">
          <div className="pc-handle">{post.author}</div>
          <div className="pc-sub">{post.time || "now"}</div>
        </div>
        {post.title && <div className="pc-title">{post.title}</div>}
      </div>

      {/* Frosted bottom bar: profile + 4 icons */}
      <div className="pc-botbar frost-bottom">
        <div className="pc-actions">
          <button className="pc-act profile" type="button" aria-label="Profile">
            <span className="ico" />
            <span>Profile</span>
          </button>

          <button className="pc-act" type="button" aria-label="Like">
            <span className="ico heart" />
            <span>Like</span>
          </button>

          <button
            className="pc-act"
            type="button"
            aria-label="Comment"
            onClick={() => setOpen((s) => !s)}
          >
            <span className="ico comment" />
            <span>Comment</span>
          </button>

          <button className="pc-act" type="button" aria-label="Share">
            <span className="ico share" />
            <span>Share</span>
          </button>

          <button className="pc-act" type="button" aria-label="Save">
            <span className="ico save" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Minimal slide‑out drawer (emoji / extras placeholder) */}
      <div className="pc-drawer">
        <div style={{ padding: "10px 12px" }}>
          <div style={{ opacity: 0.85, fontSize: 14, marginBottom: 6 }}>
            Quick reactions
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["👍", "🔥", "😍", "👏", "🤖", "🫶", "💡", "🎧", "🧠", "🌌"].map((e) => (
              <button
                key={e}
                className="pc-act"
                type="button"
                style={{ height: 34, padding: "0 10px" }}
                aria-label={`react ${e}`}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{e}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
