// src/components/PostCard.tsx
import React, { useMemo, useRef, useState } from "react";
import "./postcard.css"; // uses your frosted bars + actions CSS
import bus from "../lib/bus";
import type { Post, User } from "../types";

/**
 * Minimal, LinkedIn/IG-style post card
 * - full-bleed media (uses postcard.css)
 * - frosted top/bottom bars
 * - 5 action chips + optional drawer
 * - emits feed:hover so the orb can portal to hovered post
 * - marks itself with data-post-id for orb drag lock-on
 */
type Props = {
  post: Post;
  me?: User;
  onOpenProfile?: (id: string) => void;
  onEnterWorld?: () => void;
};

export default function PostCard({
  post,
  me,
  onOpenProfile,
  onEnterWorld,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hostRef = useRef<HTMLElement | null>(null);

  const imgSrc = useMemo(() => {
    // pick first image if present
    if (Array.isArray(post.images) && post.images.length > 0) return post.images[0];
    // tiny neutral placeholder
    return "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900'><rect width='100%' height='100%' fill='#0f1117'/></svg>`
    );
  }, [post.images]);

  // let the orb know where to fly for portal (center of the card)
  function emitHover() {
    const el = hostRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    bus.emit("feed:hover", { post, x, y });
  }

  function handleProfile() {
    if (onOpenProfile) onOpenProfile(post.author || "");
  }

  function handleWorld() {
    if (onEnterWorld) onEnterWorld();
    // Also emit a hover immediately so the orb portal has coordinates
    emitHover();
  }

  return (
    <article
      ref={hostRef as any}
      className={`post-card pc${drawerOpen ? " dopen" : ""}`}
      data-post-id={String(post.id)}
      onPointerEnter={emitHover}
    >
      {/* top glow badge (optional decorative) */}
      {/* <div className="pc-badge" aria-hidden /> */}

      {/* === Media (full-bleed) === */}
      <div className="pc-media">
        {/* image/video/canvas supported by CSS */}
        <img src={imgSrc} alt={post.title || "Post media"} />
        {/* === Frosted top bar === */}
        <div className="pc-topbar">
          <div className="pc-ava" role="img" aria-label={`Avatar of ${post.author || "user"}`}>
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt="" />
            ) : null}
          </div>
          <div className="pc-meta">
            <div className="pc-handle">{post.author || "@user"}</div>
            <div className="pc-sub">{post.time || "just now"}</div>
          </div>
          {post.title ? <div className="pc-title">{post.title}</div> : null}
        </div>

        {/* === Frosted bottom bar with 5 actions === */}
        <div className="pc-botbar">
          <div className="pc-actions">
            {/* 1) profile chip (avatar + text) */}
            <button className="pc-act profile" onClick={handleProfile} title="Open profile">
              <span className="ico" aria-hidden />
              <span>{me?.name ? me.name.split(" ")[0] : "Profile"}</span>
            </button>

            {/* 2) like */}
            <button className="pc-act" onClick={() => setDrawerOpen(false)} title="Like">
              <span className="ico heart" />
              <span>Like</span>
            </button>

            {/* 3) comment toggles drawer */}
            <button
              className="pc-act"
              onClick={() => setDrawerOpen(v => !v)}
              aria-expanded={drawerOpen}
              aria-controls={`drawer-${post.id}`}
              title="Comments"
            >
              <span className="ico comment" />
              <span>Discuss</span>
            </button>

            {/* 4) share */}
            <button className="pc-act" onClick={() => setDrawerOpen(false)} title="Share">
              <span className="ico share" />
              <span>Share</span>
            </button>

            {/* 5) world/portal */}
            <button className="pc-act" onClick={handleWorld} title="Open in World">
              <span className="ico world" />
              <span>World</span>
            </button>
          </div>
        </div>
      </div>

      {/* === Slide-out drawer (emoji, quick actions, etc.) === */}
      <div id={`drawer-${post.id}`} className="pc-drawer" role="region" aria-label="Post drawer">
        {/* keep this lightweight; you can swap in your emoji grid or shortcuts */}
        <div style={{ padding: 12, display: "grid", gap: 8 }}>
          <div style={{ opacity: 0.85 }}>Quick reactions</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["👍","🔥","😍","🎉","🤝","💡","🤖","🌐","🧠","🎯"].map((e,i)=>(
              <button key={i} className="pc-act" style={{ height: 34, padding: "0 10px" }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
