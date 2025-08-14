export type Platform = 'x' | 'facebook' | 'linkedin';

/**
 * Placeholder repost implementation.
 * In a real app this would call the platform APIs.
 */
export async function repost(platform: Platform, content: string) {
  console.log(`Reposting to ${platform}: ${content}`);
}
