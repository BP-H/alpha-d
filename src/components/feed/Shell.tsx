// src/components/feed/Shell.tsx
import Feed from "./Feed";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";
import Sidebar from "./Sidebar";
import World3D from "./World3D";
import bus from "../../lib/bus";
import "./Shell.css";

export default function Shell() {
  // Provide a no-op onPortal that still drives your bus so the type is satisfied
  const onPortal = (post: any, at: { x: number; y: number }) => {
    bus.emit("orb:portal", { post, x: at?.x ?? window.innerWidth - 56, y: at?.y ?? window.innerHeight - 56 });
  };

  return (
    <>
      {/* 3D / AI background layer behind everything */}
      <div className="world-layer" aria-hidden>
        <World3D selected={null} onBack={() => {}} />
      </div>

      {/* Sidebar (top-left) */}
      <Sidebar />

      {/* Glass feed */}
      <main className="feed-viewport">
        <Feed />
      </main>

      {/* Chat & Orb (bottom areas) */}
      <ChatDock />
      <AssistantOrb onPortal={onPortal} />
    </>
  );
}
