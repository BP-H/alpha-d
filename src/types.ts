export type Post = {
  id: string | number;
  author?: string;
  authorAvatar?: string;
  title?: string;
  time?: string;
  location?: string;
  image?: string;
  images?: string[];
  cover?: string;
};

export type AssistantMessage = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  text: string;
  ts: number;
  postId?: string | number | null;
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
  src?: string; // image or media url
  params?: Record<string, unknown>;
};

export type WorldState = {
  theme: "dark" | "light";
  orbCount: number;
  gridOpacity: number;
  fogLevel: number;
  orbColor: string;
};
