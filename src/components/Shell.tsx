// src/components/Shell.tsx
import React, { useCallback } from "react";

import BrandBadge from "./BrandBadge";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";
import Feed from "./feed/Feed";
import World3D from "./World3D";

/**
 * Minimal, defensive Shell:
 * - Never imports placeholders or server data.
 * - Always mounts the feed.
 * - Keeps the 3D world behind the UI and non-interactive.
 * - Wires AssistantOrb.onPortal so prior portal behaviour can be re-added later.
 */
export default function Shell() {
  const handlePortal = useCallback(
    (_post: any, _at: { x: number; y: number }) => {
      // No-op for layout work. You can navigate to a portal here later.
    },
    []
  );

  return (
    <>
      {/* 3D background layer — cannot steal clicks */}
      <div className="world-layer" aria-hidden="true" style={{ pointerEvents: "none" }}>
        <World3D selected={null as any} onBack={() => {}} />
      </div>

      {/* Brand (top-left) */}
      <BrandBadge onEnterUniverse={() => { /* no-op for now */ }} />

      {/* Main content (feed) */}
      <main className="content-viewport" style={{ zIndex: 10 }}>
        <div className="feed-wrap">
          <div className="feed-content">
            <Feed />
          </div>
        </div>
      </main>

      {/* Assistant & chat */}
      <AssistantOrb onPortal={handlePortal} />
      <ChatDock />
    </>
  );
}
