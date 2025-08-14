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
  const img = (post as any).images?.[0] as string | undefined;
  const video = (post as any).video as string | undefined;
  const mediaFallback = "/vite.svg";

  const onMediaReady = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
    const el = e.currentTarget as HTMLImageElement | HTMLVideoElement;
    // reveal (our CSS starts at opacity:0)
    try {
      el.style.opacity = "1";
    } catch {}
    // revoke blob URL *after* media has loaded
    const src =
      (el as HTMLImageElement).currentSrc ||
      (el as HTMLImageElement).src ||
      (el as HTMLVideoElement).currentSrc ||
      (el as HTMLVideoElement).src ||
      "";
    if (src && src.startsWith("blob:")) {
      try { URL.revokeObjectURL(src); } catch {}
    }
  };

  return (
    <article className="pc" data-post-id={(post as any).id}>
      {/* media */}
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
            onClick={() => onOpenProfile?.((post as any).author || "")}
            role="button"
          />
          <div className="pc-meta">
            <div className="pc-handle">{(post as any).author || "@someone"}</div>
            <div className="pc-sub">{(post as any).time || "now"}</div>
          </div>
          <div className="pc-title">{(post as any).title || "Untitled"}</div>
        </div>

        {/* frosted bottom bar */}
        <div className="pc-botbar">
          <div className="pc-actions">
            <button className="pc-act profile" onClick={() => onOpenProfile?.((post as any).author || "")}>
              <span className="ico" />
              {(post as any).author || "Profile"}
            </button>
            <button className="pc-act">
              <span className="ico heart" /> Like
            </button>
            <button className="pc-act">
              <span className="ico comment" /> Comment
            </button>
            <button className="pc-act" onClick={() => sharePost({ url: post.link || window.location.href, title: post.title })}>
              <span className="ico share" /> Share
            </button>
            <button className="pc-act" onClick={() => onEnterWorld?.()}>
              <span className="ico world" /> Enter
            </button>
          </div>
        </div>
      </div>

      {/* optional slide drawer */}
      <div className="pc-drawer">{/* comments or emoji drawer later */}</div>
    </article>
  );
}
