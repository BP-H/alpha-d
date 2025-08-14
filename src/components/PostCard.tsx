// src/components/PostCard.tsx
import "./postcard.css";
import type { Post, User } from "../types";

type Props = {
  post: Post;
  me?: User;
  onOpenProfile?: (id: string) => void;
  onEnterWorld?: () => void;
};

export default function PostCard({ post, onOpenProfile, onEnterWorld }: Props) {
  const img = (post as any).images?.[0] || "/vite.svg";

  return (
    <article className="pc" data-post-id={(post as any).id}>
      {/* media */}
      <div className="pc-media">
        <img src={img} alt="" loading="lazy" />
        {/* frosted top bar */}
        <div className="pc-topbar">
          <div className="pc-ava" onClick={() => onOpenProfile?.((post as any).author || "")} role="button" />
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
            <button className="pc-act">
              <span className="ico share" /> Share
            </button>
            <button className="pc-act" onClick={() => onEnterWorld?.()}>
              <span className="ico world" /> Enter
            </button>
          </div>
        </div>
      </div>

      {/* optional slide drawer */}
      <div className="pc-drawer">
        {/* put comments or emoji drawer here later */}
      </div>
    </article>
  );
}
