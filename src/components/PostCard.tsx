// src/components/PostCard.tsx
import "./postcard.css";
import type { Post, User } from "../types";
import { sharePost } from "../lib/share";

type Props = {
  post: Post;
  me?: User;
  onOpenProfile?: (id: string) => void;
  onEnterWorld?: () => void;
};

export default function PostCard({ post, onOpenProfile, onEnterWorld }: Props) {
  // Prefer cover → image → first of images for widest compatibility
  const img =
    (post as any).cover ||
    (post as any).image ||
    ((post as any).images?.[0] as string | undefined);
  const video = (post as any).video as string | undefined;
  const pdf = (post as any).pdf as string | undefined;
  const model3d = (post as any).model3d as string | undefined;
  const mediaFallback = "/vite.svg";

  const onMediaReady = (e: React.SyntheticEvent<any>) => {
    const el = e.currentTarget as any;
    // reveal (CSS starts at opacity: 0)
    try {
      el.style.opacity = "1";
    } catch {}
    // revoke blob URL *after* media has loaded to free memory
    const src =
      el.currentSrc ||
      el.src ||
      el.getAttribute?.("src") ||
      "";
    if (src && src.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(src);
      } catch {}
    }
  };

  const author = (post as any).author || "@someone";

  return (
    <article className="pc" data-post-id={(post as any).id}>
      {/* media */}
      <div className="pc-media">
        {pdf ? (
          <iframe src={pdf} onLoad={onMediaReady} />
        ) : model3d ? (
          <model-viewer src={model3d} onLoad={onMediaReady} camera-controls />
        ) : video ? (
          <video
            src={video}
            controls
            playsInline
            preload="metadata"
            onLoadedData={onMediaReady}
          />
        ) : (
          <img
            src={img || mediaFallback}
            alt=""
            loading="lazy"
            onLoad={onMediaReady}
          />
        )}

        {/* frosted top bar */}
        <div className="pc-topbar">
          <div
            className="pc-ava"
            onClick={() => onOpenProfile?.(author)}
            role="button"
          />
          <div className="pc-meta">
            <div className="pc-handle">{author}</div>
            <div className="pc-sub">{(post as any).time || "now"}</div>
          </div>
          <div className="pc-title">{(post as any).title || "Untitled"}</div>
        </div>

        {/* frosted bottom bar */}
        <div className="pc-botbar">
          <div className="pc-actions">
            <button
              className="pc-act profile"
              onClick={() => onOpenProfile?.(author)}
            >
              <span className="ico" />
              {author || "Profile"}
            </button>

            <button className="pc-act">
              <span className="ico heart" /> Like
            </button>

            <button className="pc-act">
              <span className="ico comment" /> Comment
            </button>

            {/* ⬅️ FIX: pass the Post object (works with your current share.ts typing) */}
            <button className="pc-act" onClick={() => sharePost(post)}>
              <span className="ico share" /> Share
            </button>

            <button className="pc-act" onClick={() => onEnterWorld?.()}>
              <span className="ico world" /> Enter
            </button>
          </div>
        </div>
      </div>

      {/* optional slide drawer */}
      <div className="pc-drawer">{/* comments / emoji later */}</div>
    </article>
  );
}
