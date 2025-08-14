// src/components/Shell.tsx
import AssistantOrb from "./AssistantOrb";
import World3D from "./World3D";
import Feed from "./feed/Feed";
import ChatDock from "./ChatDock";
import BrandBadge from "./BrandBadge";

export default function Shell() {
  return (
    <>
      {/* 3D / AI background behind everything */}
      <div className="world-layer" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <World3D selected={null} onBack={() => {}} />
      </div>

      {/* Foreground feed */}
      <main className="content-viewport" style={{ height: "100dvh", overflow: "auto", position: "relative", zIndex: 10 }}>
        <div className="feed-wrap" style={{ padding: "8px 0 80px" }}>
          <Feed />
        </div>
      </main>

      {/* Top-left brand button (required prop) */}
      <BrandBadge onEnterUniverse={() => { /* no-op for now */ }} />

      {/* Chat + Orb */}
      <ChatDock />
      <AssistantOrb />
    </>
  );
}
