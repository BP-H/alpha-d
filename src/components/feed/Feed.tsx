// src/components/feed/Feed.tsx
import PostCard from "../PostCard";
import type { Post, User } from "../../types";
import { demoPosts } from "../../lib/placeholders";

type Props = {
  me: User;
  onOpenProfile: (id: string) => void;
  onEnterWorld: () => void;
};

export default function Feed({ me, onOpenProfile, onEnterWorld }: Props) {
  const posts: Post[] = demoPosts as any;

  return (
    <div className="feed-content" style={{ width: "100%", margin: "0 auto", display: "grid", gap: "1px" }}>
      {posts.map((post) => (
        <PostCard
          key={(post as any).id}
          post={post}
          me={me}
          onOpenProfile={onOpenProfile}
          onEnterWorld={onEnterWorld}
        />
      ))}
    </div>
  );
}
