import { useState } from "react";
import { Post, User } from "../types";

type Props = {
  post: Post;
  me: User;
  onOpenProfile?: (id: string) => void;
  onEnterWorld?: () => void;
};

export default function PostCard({ post, me, onOpenProfile, onEnterWorld }: Props) {
  const [open, setOpen] = useState(false);

  // Resolve first image URL (supports string or {url})
  const first = post.images?.[0] as any;
  const imgUrl: string = typeof first === "string" ? first : first?.url ?? "";
  const imgAlt: string = typeof first === "object" && first?.alt ? first.alt : (post.title ?? "");

  return (
    <article className="post" aria-label={post.title ?? post.author}>
      {/* Frost TOP (flush) */}
      <div className="frost frost-top">
        <button
          className="avatar-circle"
          style={{ backgroundImage: `url(${post.authorAvatar})` }}
          aria-label={`Open ${post.author}'s profile`}
          onClick={() => onOpenProfile?.(post.id)}
        />
        <div className="author">
          <div className="name">{post.author}</div>
          <div className="time">{post.time}</div>
        </div>
        {post.title && <span className="chip">{post.title}</span>}
      </div>

      {/* Media (real height; bg + hidden img) */}
      <div
        className="post-media"
        style={{ backgroundImage: imgUrl ? `url(${imgUrl})` : undefined }}
      >
        {imgUrl && (
          <img
            src={imgUrl}
            alt={imgAlt}
            width={800}
            height={1000}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      {/* Frost BOTTOM — 5 equal cells: avatar + 4 evenly spaced icons */}
      <div className="frost frost-bottom">
        <button
          className="me-circle"
          aria-label="Open your profile"
          style={{ backgroundImage: `url(${me.avatar})` }}
        />
        <button className="icon-btn" aria-label="Like"><IconHeart /></button>
        <button className="icon-btn" aria-label="Comment" onClick={() => setOpen(v => !v)}><IconChat /></button>
        <button className="icon-btn" aria-label="Remix"><IconRemix /></button>
        <button className="icon-btn" aria-label="Enter Universe" onClick={() => onEnterWorld?.()}><IconPortal /></button>
      </div>

      {/* Optional drawer */}
      <div className={`drawer ${open ? "open" : ""}`}>engagement drawer…</div>
    </article>
  );
}

/* Minimal neutral icons */
function IconHeart(){return(<svg className="ico" viewBox="0 0 24 24"><path d="M12 21s-8-4.5-8-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-8 10-8 10z" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>)}
function IconChat(){return(<svg className="ico" viewBox="0 0 24 24"><path d="M21 12a8 8 0 1 1-3.3-6.5L21 5v7zM8 19l-5 2 2-5" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>)}
function IconRemix(){return(<svg className="ico" viewBox="0 0 24 24"><path d="M4 8h10v6H4zM9 14v4l4-4" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>)}
function IconPortal(){return(<svg className="ico" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>)}
