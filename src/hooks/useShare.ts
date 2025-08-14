import bus from "../lib/bus";
import { importPosts as importFrom } from "../lib/import";
import { repost } from "../lib/repost";
import type { Platform } from "../lib/repost";

/**
 * Share a post link using the Web Share API when available.
 * Falls back to copying the URL to the clipboard and emitting a toast.
 */
export async function sharePost(url: string, title?: string) {
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
}

/**
 * Emit a repost event so other parts of the app can duplicate a card.
 */
export function repostPost(id: string) {
  bus.emit("feed:repost", id);
  bus.emit("toast", "Repost successful");
}

/**
 * Import content from a connected platform and surface status via toast.
 */
export async function importContent(platform: Platform) {
  try {
    await importFrom(platform);
    bus.emit("toast", `Imported from ${platform}`);
  } catch (err) {
    bus.emit("toast", "Import failed");
    console.error(err);
  }
}

/**
 * Repost content to a platform and surface status via toast.
 */
export async function repostContent(platform: Platform, content: string) {
  try {
    await repost(platform, content);
    bus.emit("toast", `Reposted to ${platform}`);
  } catch (err) {
    bus.emit("toast", "Repost failed");
    console.error(err);
  }
}

