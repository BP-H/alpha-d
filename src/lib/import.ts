import type { Platform } from "./repost";

/**
 * Placeholder import implementation.
 * In a real app this would call the platform APIs.
 */
export async function importPosts(platform: Platform) {
  console.log(`Importing from ${platform}`);
}
