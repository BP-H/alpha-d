// src/lib/share.ts
import type { Post } from "../types";

export async function sharePost(post: Post) {
  const url = `${location.origin}/post/${post.id}`;
  const data = { title: post.title, url };

  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch {
      /* fall through */
    }
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const area = document.createElement("textarea");
    area.value = url;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
    } catch {}
    document.body.removeChild(area);
  }
}
