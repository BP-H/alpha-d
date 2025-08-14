// src/components/feed/PostCard.tsx
import { useMemo, useState } from "react";
import type { Post } from "../../types";
import bus from "../../lib/bus";
import "./postcard.css";

type Props = { post: Post };

export default function PostCard({ post }: Props) {
  const [drawer, setDrawer] = useState(false);

  // Media fallback (image/video/canvas → pick first image-like thing)
  const mediaSrc = useMemo(() => {
    const img = (post as any)?.images?.[0] || (post as any)?.image || (post as any)?.cover;
    if (typeof img === "string") return img;
    if (img?.url) return img.url;
    return "/vite.svg";
  }, [post]);

  const handleWorld = () => {
    // Fire the same portal bus event your orb/portal flow already uses
    const x = window.innerWidth - 56, y = window.innerHeight - 56;
    bus.emit("orb:portal", { post, x, y });
  };

  return (
    <article className={`pc ${drawer ? "dopen" : ""}`} data-post-id={String(post.id || "")}>
      {/* Optional glowing badge in the top-left */}
      <div className="pc-badge" aria-hidden />

      {/* Media */}
      <div className="pc-media">
        {/* Full-bleed image/video — keep aspect via natural size */}
        <img src={mediaSrc} alt={post.title || post.author || "post"} loading="lazy" />
        {/* Frosted top bar */}
        <div className="pc-topbar">
          <div className="pc-ava" title={post.author}>
            <img src={(post as any).authorAvatar || "/avatar.jpg"} alt={post.author || "user"} />
          </div>
          <div className="pc-meta">
            <div className="pc-handle">{post.author || "@user"}</div>
            <div className="pc-sub">{(post as any).time || "now"} • {(post as any).location || "superNova"}</div>
          </div>
          {post.title && <div className="pc-title">{post.title}</div>}
        </div>

        {/* Frosted bottom bar with 5 minimal chips */}
        <div className="pc-botbar">
          <div className="pc-actions">
            <button className="pc-act profile" title="Profile">
              <span className="ico" aria-hidden />
              <span>{post.author?.replace("@", "") || "profile"}</span>
            </button>

            <button className="pc-act" onClick={() => setDrawer((v) => !v)} title="Like">
              <span className="ico heart" />
              <span>Like</span>
            </button>

            <button className="pc-act" onClick={() => setDrawer((v) => !v)} title="Comment">
              <span className="ico comment" />
              <span>Comment</span>
            </button>

            <button className="pc-act" onClick={handleWorld} title="Enter world">
              <span className="ico world" />
              <span>World</span>
            </button>

            <button className="pc-act" title="Save">
              <span className="ico save" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out drawer (comments/composer/etc.) */}
      <div className="pc-drawer">
        {/* Keep this simple for now; you can mount your composer here later */}
        <div style={{ padding: "14px 18px" }}>
          <strong>Quick actions</strong>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            This space is for comments, emoji tray, or remix prompts.
          </div>
        </div>
      </div>
    </article>
  );
}
