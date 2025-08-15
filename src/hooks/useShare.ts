import bus from "../lib/bus";

/**
 * Share a post link using the Web Share API when available.
 * Falls back to copying the URL to the clipboard and emitting a toast.
 */
export async function sharePost(url: string, title?: string) {
  if (typeof navigator !== "undefined") {
    try {
      if (navigator.share) {
        await navigator.share({ url, title });
        return;
      }
    } catch (err) {
      // ignore abort errors but log others
      if ((err as any)?.name !== "AbortError") console.error(err);
    }

    try {
      await navigator.clipboard.writeText(url);
      bus.emit("toast", "Link copied to clipboard");
    } catch (err) {
      bus.emit("toast", "Copy failed");
      console.error(err);
    }
  } else {
    bus.emit("toast", "Sharing not supported");
  }
}

/**
 * Emit a repost event so other parts of the app can duplicate a card.
 */
export function repostPost(id: string) {
  bus.emit("feed:repost", id);
}

