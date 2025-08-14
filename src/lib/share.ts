// src/lib/share.ts
export interface ShareOptions {
  url: string;
  title?: string;
  text?: string;
}

/**
 * sharePost
 * Uses the Web Share API when available, otherwise copies the URL to the clipboard.
 */
export async function sharePost({ url, title, text }: ShareOptions): Promise<boolean> {
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ url, title, text });
      return true;
    } catch {
      /* ignore and fallback */
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export default sharePost;
