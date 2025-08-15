// src/types.ts

// Shared ID alias
export type ID = string | number;

export type User = {
  id: ID;
  name?: string;
  handle?: string;
  avatar?: string;
};

export type Post = {
  id: ID;
  author?: string;
  authorAvatar?: string;
  title?: string;
  time?: string;
  location?: string;

  /** Media (new + legacy) */
  image?: string;       // legacy single image
  images?: string[];    // preferred: multiple images
  cover?: string;       // legacy alias
  video?: string;       // optional video URL (blob:/remote)
  pdf?: string;         // optional PDF URL (blob:/remote)
  model3d?: string;     // optional 3D model URL (blob:/remote)
  link?: string;        // optional external link being shared
};

export type AssistantMessage = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  text: string;
  ts: number;
  postId?: ID | null;
  meta?: Record<string, unknown>;
};

export type SearchResult = {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  score?: number;
};

export type RemixSpec = {
  kind: "image-to-video" | "style-transfer" | "music-reactive" | "prompt-video";
  src?: string;
  params?: Record<string, unknown>;
};

export type WorldState = {
  theme: "dark" | "light";
  orbCount: number;
  gridOpacity: number;
  fogLevel: number;
  orbColor: string;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}
