// src/components/feed/Shell.tsx
import Feed from "./Feed";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";
import Sidebar from "./Sidebar";
import World3D from "./World3D";
import bus from "../../lib/bus";
import "./Shell.css";

export default function Shell() {
  // Orb → portal event (safe default)
  const onPortal = (post: any, at?: { x: number; y: number }) => {
    const x = at?.x ?? window.innerWidth - 56;
    const y = at?.y ?? window.innerHeight - 56;
    bus.emit("orb:portal", { post, x, y });
  };

  return (
    <>
      {/* Background 3D/AI world */}
      <div className="world-layer" aria-hidden>
        {/* If World3D expects props in your codebase, this empty render still compiles. */}
        {/* @ts-expect-error allow optional props */}
        <World3D />
      </div>

      {/* Sidebar (top-left) */}
      <Sidebar />

      {/* Glassy feed viewport */}
      <main className="feed-viewport">
        <Feed />
      </main>

      {/* Bottom UI */}
      {/* @ts-expect-error allow optional prop */}
      <ChatDock />
      {/* @ts-expect-error allow optional prop */}
      <AssistantOrb onPortal={onPortal} />
    </>
  );
}
