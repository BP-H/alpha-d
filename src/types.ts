export type ImageAsset = { id: string; url: string; alt?: string };
export type Post = {
  id: string;
  author: string;
  authorAvatar: string;
  title?: string;
  time: string;
  images: ImageAsset[];
};
export type User = { id: string; name: string; avatar: string };
