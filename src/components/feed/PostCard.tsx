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
    const off1 = bus.on?.("post:comment", ({ id, body }) => {
      if (String(id) !== String(post.id)) return;
      setDrawer(true);
      setComments((s) => [body, ...s]);
    });
    const off2 = bus.on?.("post:react", ({ id, emoji }) => {
      if (String(id) !== String(post.id)) return;
      setDrawer(true);
      setReactions((s) => [emoji, ...s].slice(0, 40));
    });
    const off3 = bus.on?.("post:focus", ({ id }) => {
      if (String(id) !== String(post.id)) return;
      setDrawer(true);
    });
    return () => {
      try { off1?.(); } catch {}
      try { off2?.(); } catch {}
      try { off3?.(); } catch {}
    };
  }, [post.id]);

  // Build image list (images[] preferred, else image/cover, else fallback)
  const images = useMemo(() => {
    const out: string[] = [];
    const srcs =
      post?.images && post.images.length
        ? post.images
        : [post?.image || post?.cover].filter(Boolean);

    for (const img of srcs as any[]) {
      if (!img) continue;
      if (typeof img === "string") out.push(img);
      else if (img.url) out.push(String(img.url));
    }
    if (!out.length) out.push("/vite.svg");
    return out;
  }, [post]);

  const [imgIndex, setImgIndex] = useState(0);
  useEffect(() => { setImgIndex(0); }, [images]);

  const pdf = (post as any)?.pdf as string | undefined;
  const model3d = (post as any)?.model3d as string | undefined;
  const video = (post as any)?.video as string | undefined;

  const onMediaReady = (e: React.SyntheticEvent<any>) => {
    const el = e.currentTarget as any;
    try { el.style.opacity = "1"; } catch {}
    const src: string = el.currentSrc || el.src || el.getAttribute?.("src") || "";
    if (src && src.startsWith("blob:")) {
      try { URL.revokeObjectURL(src); } catch {}
    }
  };

  return (
    <article
      className={`pc ${drawer ? "dopen" : ""}`}
      data-post-id={String(post?.id || "")}
      id={`post-${post.id}`}
    >
      <div className="pc-badge" aria-hidden />
      <div className="pc-media">
        {/* Primary media: PDF → 3D → Video → Images (carousel) */}
        {pdf ? (
          <iframe
            src={pdf}
            title="PDF preview"
            onLoad={onMediaReady}
            style={{ opacity: 0 }}
          />
        ) : model3d ? (
          <model-viewer
            src={model3d}
            camera-controls
            onLoad={onMediaReady as any}
            style={{ opacity: 0 }}
          />
        ) : video ? (
          <video
            src={video}
            controls
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            onLoadedData={onMediaReady}
            style={{ opacity: 0 }}
          />
        ) : (
          <>
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={post?.title || post?.author || "post"}
                loading="lazy"
                crossOrigin="anonymous"
                onLoad={onMediaReady}
                className={i === imgIndex ? "active" : ""}
                style={{ display: i === imgIndex ? "block" : "none" }}
              />
            ))}
            {images.length > 1 && (
              <>
                <button
                  className="pc-nav prev"
                  onClick={() =>
                    setImgIndex((i) => (i - 1 + images.length) % images.length)
                  }
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  className="pc-nav next"
                  onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                  aria-label="Next image"
                >
                  ›
                </button>
                <div className="pc-dots">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      className={i === imgIndex ? "on" : ""}
                      onClick={() => setImgIndex(i)}
                      aria-label={`View image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="pc-topbar">
          <div className="pc-ava" title={post?.author}>
            <img
              src={post?.authorAvatar || "/avatar.jpg"}
              alt={post?.author || "user"}
            />
          </div>
          <div className="pc-meta">
            <div className="pc-handle">{post?.author || "@user"}</div>
            <div className="pc-sub">
              {post?.time || "now"} • {post?.location || "superNova"}
            </div>
          </div>
          {post?.title && <div className="pc-title">{post.title}</div>}
        </div>

        <div className="pc-botbar">
          <div className="pc-actions">
            <button className="pc-act profile" title="Profile">
              <span className="ico" aria-hidden />
              <span>{post?.author?.replace?.("@", "") || "profile"}</span>
            </button>
            <button
              className="pc-act"
              onClick={() => setDrawer((v) => !v)}
              title="Like"
            >
              <span className="ico heart" />
              <span>Like</span>
            </button>
            <button
              className="pc-act"
              onClick={() => setDrawer((v) => !v)}
              title="Comment"
            >
              <span className="ico comment" />
              <span>Comment</span>
            </button>
            <button
              className="pc-act"
              title="World"
              onClick={() => bus.emit?.("orb:portal", { post, x: 0, y: 0 })}
            >
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

      <div className="pc-drawer">
        <div style={{ padding: "12px 18px 0" }}>
          <strong>Reactions</strong>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {reactions.length ? (
              reactions.map((e, i) => (
                <span key={i} style={{ fontSize: 20 }}>
                  {e}
                </span>
              ))
            ) : (
              <span style={{ opacity: 0.7 }}>—</span>
            )}
          </div>
        </div>
        <div style={{ padding: "12px 18px" }}>
          <strong>Comments</strong>
          {comments.length ? (
            <ul
              style={{
                margin: "8px 0 0",
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: 6,
              }}
            >
              {comments.map((c, i) => (
                <li
                  key={i}
                  style={{
                    opacity: 0.95,
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.12)",
                    padding: "8px 10px",
                    borderRadius: 10,
                  }}
                >
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ opacity: 0.7, marginTop: 8 }}>—</div>
          )}
        </div>
      </div>
    </article>
  );
}
