import React, { useMemo } from "react";
import Feed from "./feed/Feed";
import AssistantOrb from "./AssistantOrb";
import World3D from "./World3D";
import ChatDock from "./ChatDock";
import bus from "../lib/bus";
import * as placeholders from "../lib/placeholders";

// Feed's exact "Me" type lives in the Feed file; we don't need its shape here.
// We'll assemble a tolerant object and cast to any to satisfy TS at the call-site.
type MeLoose = any;

export default function Shell() {
  // Try to source the current user from your placeholders module,
  // but fall back to a minimal "me" if fields are named differently.
  const me: MeLoose = useMemo(() => {
    const p: any =
      (placeholders as any).me ||
      (placeholders as any).ME ||
      (placeholders as any).currentUser ||
      {};
    return {
      id: p.id ?? "me",
      name: p.name ?? p.displayName ?? "You",
      handle: p.handle ?? p.username ?? "@you",
      avatar: p.avatar ?? p.avatarUrl ?? p.photo ?? "",
    } as any;
  }, []);

  // Hook up world/portal bus the same way the rest of the app expects.
  const onEnterWorld = () => {
    try {
      bus.emit?.("ui:enter-world", {});
    } catch {}
  };

  const onPortal = (post: any, at: { x: number; y: number }) => {
    try {
      bus.emit?.("portal:open", { post, at });
    } catch {}
  };

  return (
    <>
      {/* 3D background sits behind everything and does not steal input */}
      <div className="world-layer">
        <World3D selected={null} onBack={() => {}} />
      </div>

      {/* Scrollable feed viewport (your CSS targets these classes) */}
      <div className="content-viewport">
        <div className="feed-wrap">
          {/* ✅ pass required props back to Feed */}
          <Feed me={me} onEnterWorld={onEnterWorld} />
        </div>
      </div>

      {/* Fixed overlay UI */}
      <AssistantOrb onPortal={onPortal} />
      <ChatDock />
    </>
  );
}
