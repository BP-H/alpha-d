// src/components/Shell.tsx
import Feed from "./feed/Feed";
import Sidebar from "./Sidebar";
import World3D from "./World3D";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";
import "./Shell.css";

export default function Shell() {
  return (
    <>
      {/* 3D/AI background layer behind everything */}
      <div className="world-layer" aria-hidden>
        <World3D />
      </div>

      {/* Sleek pop-out sidebar (top-left) */}
      <Sidebar />

      {/* Glassy feed viewport */}
      <main className="feed-viewport">
        <Feed />
      </main>

      {/* Bottom utilities */}
      <ChatDock />
      <AssistantOrb />
    </>
  );
}
