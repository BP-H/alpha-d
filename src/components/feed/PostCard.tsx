// src/components/feed/PostCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import "./postcard.css";
import type { Post } from "../../types";
import bus from "../../lib/bus";

export default function PostCard({ post }: { post: Post }) {
  const [drawer, setDrawer] = useState(false);
  const [comments, setComments] = useState<string[]>([]);
  const [reactions, setReactions] = useState<string[]>([]);

  useEffect(() => {
    const off1 = bus.on("post:comment", ({ id, body }) => {
      if (String(id) !== String(post.id)) return;
      setDrawer(true);
      setComments(s => [body, ...s]);
    });
    const off2 = bus.on("post:react", ({ id, emoji }) => {
      if (String(id) !== String(post.id)) return;
      setDrawer(true);
      setReactions(s => [emoji, ...s].slice(0, 40));
    });
    const off3 = bus.on("post:focus", ({ id }) => {
      if (String(id) !== String(post.id)) return;
      setDrawer(true);
    });
    return () => { off1?.(); off2?.(); off3?.(); };
  }, [post.id]);

  const mediaSrc = useMemo(() => {
    const img = post?.images?.[0] || post?.image || post?.cover;
    if (typeof img === "string") return img;
    if ((img as any)?.url) return (img as any).url as string;
    return "/vite.svg";
  }, [post]);
  const video = (post as any).video as string | undefined;

  const onMediaReady = (
    e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>
  ) => {
    const el = e.currentTarget as HTMLImageElement | HTMLVideoElement;
    try {
      el.style.opacity = "1";
    } catch {}
    const src =
      (el as HTMLImageElement).currentSrc ||
      (el as HTMLImageElement).src ||
      (el as HTMLVideoElement).currentSrc ||
      (el as HTMLVideoElement).src ||
      "";
    if (src && src.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(src);
      } catch {}
    }
  };

  return (
    <article className={`pc ${drawer ? "dopen" : ""}`} data-post-id={String(post?.id || "")} id={`post-${post.id}`}>
      <div className="pc-badge" aria-hidden />
      <div className="pc-media">
        {video ? (
          <video
            src={video}
            controls
            playsInline
            preload="metadata"
            onLoadedData={onMediaReady}
          />
        ) : (
          <img
            src={mediaSrc}
            alt={post?.title || post?.author || "post"}
            loading="lazy"
            crossOrigin="anonymous"
            onLoad={onMediaReady}
          />
        )}

        <div className="pc-topbar">
          <div className="pc-ava" title={post?.author}>
            <img src={post?.authorAvatar || "/avatar.jpg"} alt={post?.author || "user"} />
          </div>
          <div className="pc-meta">
            <div className="pc-handle">{post?.author || "@user"}</div>
            <div className="pc-sub">{post?.time || "now"} • {post?.location || "superNova"}</div>
          </div>
          {post?.title && <div className="pc-title">{post.title}</div>}
        </div>

        <div className="pc-botbar">
          <div className="pc-actions">
            <button className="pc-act profile" title="Profile">
              <span className="ico" aria-hidden />
              <span>{post?.author?.replace?.("@","") || "profile"}</span>
            </button>
            <button className="pc-act" onClick={() => setDrawer(v => !v)} title="Like">
              <span className="ico heart" /><span>Like</span>
            </button>
            <button className="pc-act" onClick={() => setDrawer(v => !v)} title="Comment">
              <span className="ico comment" /><span>Comment</span>
            </button>
            <button className="pc-act" title="World" onClick={() => bus.emit("orb:portal", { post, x: 0, y: 0 })}>
              <span className="ico world" /><span>World</span>
            </button>
            <button className="pc-act" title="Save">
              <span className="ico save" /><span>Save</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pc-drawer">
        <div style={{ padding: "12px 18px 0" }}>
          <strong>Reactions</strong>
          <div style={{ marginTop: 8, display: "flex", gap:8, flexWrap:"wrap" }}>
            {reactions.length ? reactions.map((e, i) => <span key={i} style={{ fontSize:20 }}>{e}</span>) : <span style={{opacity:.7}}>—</span>}
          </div>
        </div>
        <div style={{ padding: "12px 18px" }}>
          <strong>Comments</strong>
          {comments.length ? (
            <ul style={{ margin:"8px 0 0", padding:0, listStyle:"none", display:"grid", gap:6 }}>
              {comments.map((c, i) => <li key={i} style={{ opacity:.95, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", padding:"8px 10px", borderRadius:10 }}>{c}</li>)}
            </ul>
          ) : <div style={{ opacity:.7, marginTop:8 }}>—</div>}
        </div>
      </div>
    </article>
  );
}
