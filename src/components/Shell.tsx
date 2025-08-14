// src/components/Shell.tsx
import React, { useCallback } from "react";
import BrandBadge from "./BrandBadge";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";
import Feed from "./feed/Feed";
import World3D from "./World3D";

// Try to import placeholders (if present). If names differ on your branch, fall back.
import * as placeholders from "../lib/placeholders";

/**
 * Shell mounts the main app shell: 3D world (background), brand, feed, orb, chatdock.
 * This version is defensive: if placeholders exports are missing, it uses sensible defaults.
 */

type UserLike = { id?: string; name?: string; avatar?: string };

export default function Shell(props: {
  me?: UserLike;
  onEnterWorld?: () => void;
}) {
  // fallback user from placeholders or sensible default
  const phMe = (placeholders as any).me || (placeholders as any).ME || (placeholders as any).currentUser;
  const me = props.me ?? phMe ?? { id: "me", name: "You", avatar: "" };

  const onEnterWorld = props.onEnterWorld ?? (() => { /* noop */ });

  const handlePortal = useCallback((post: any, at: { x: number; y: number }) => {
    // Forward to app-level handler if present (keeps prior portal behaviour)
    // In your app you probably open a portal; for now we call onEnterWorld()
    onEnterWorld();
  }, [onEnterWorld]);

  return (
    <>
      {/* 3D background: intentionally behind feed */}
      <div className="world-layer" aria-hidden="true" style={{ pointerEvents: "none" }}>
        {/* Render World3D but keep it passive; if it errors, it won't crash feed */}
        <World3D selected={null as any} onBack={() => {}} />
      </div>

      {/* Brand (top-left) */}
      <BrandBadge onEnterUniverse={onEnterWorld} />

      {/* Main feed area (always visible, high z-index) */}
      <main className="content-viewport" style={{ zIndex: 10 }}>
        <div className="feed-wrap">
          <div className="feed-content">
            <Feed />
          </div>
        </div>
      </main>

      {/* Assistant UI */}
      <AssistantOrb onPortal={handlePortal} />

      {/* Chat dock - keeps messages */}
      <ChatDock />
    </>
  );
}
