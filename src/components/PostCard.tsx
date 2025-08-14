// src/components/PostCard.tsx
import "./postcard.css";
import "./postcard.media.css"; // small add-on: ensures media fills and fades in
import type { Post, User } from "../types";
import { sharePost } from "../lib/share";

type Props = {
  post: Post;
  me?: User;
  onOpenProfile?: (id: string) => void;
  onEnterWorld?: () => void;
};

export default function PostCard({ post, onOpenProfile, onEnterWorld }: Props) {
  // prefer cover → image → first of images
  const img =
    // @ts-ignore – some data shapes may use cover/image
    (post as any).cover ||
    // @ts-ignore
    (post as any).image ||
    post.images?.[0];

  const video = (post as any).video as string | undefined;
  const mediaFallback = "/vite.svg";

  const author = (post as any).author || "@someone";

  return (
    <article className="pc" data-post-id={`${(post as any).id ?? ""}`}>
      {/* media */}
      <div className="pc-media">
        {video ? (
          <video
            src={video}
            controls
            playsInline
            preload="metadata"
            onLoadedData={(e) => (e.currentTarget.style.opacity = "1")}
          />
        ) : (
          <img
            src={img || mediaFallback}
            alt=""
            loading="lazy"
            onLoad={(e) => (e.currentTarget.style.opacity = "1")}
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

            <button
              className="pc-act"
              onClick={() => {
                const url =
                  // if the post has an explicit link, prefer it
                  (post as any).link ||
                  // otherwise share whatever media URL we have
                  (typeof img === "string" ? img : window.location.href);
                // matches lib/share.ts (ShareOptions)
                // @ts-ignore allow both current and older signatures
                sharePost({ url, title: (post as any).title || "" });
              }}
            >
              <span className="ico share" /> Share
            </button>

            <button className="pc-act" onClick={() => onEnterWorld?.()}>
              <span className="ico world" /> Enter
            </button>
          </div>
        </div>
      </div>

      {/* optional slide drawer */}
      <div className="pc-drawer">{/* future: comments / emoji, etc. */}</div>
    </article>
  );
}
