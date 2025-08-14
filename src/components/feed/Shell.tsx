import Feed from "./Feed";
import AssistantOrb from "../AssistantOrb";
import ChatDock from "../ChatDock";
import Sidebar from "../Sidebar";
import World3D from "../World3D";
import bus from "../../lib/bus";
import type { Post } from "../../types";
import "./Shell.css";

export default function Shell() {
  // Orb → portal event
  const onPortal = (post: Post, at?: { x: number; y: number }) => {
    const x = at?.x ?? window.innerWidth - 56;
    const y = at?.y ?? window.innerHeight - 56;
    bus.emit("orb:portal", { post, x, y });
  };

  return (
    <>
      {/* Background 3D/AI world layer behind feed */}
      <div className="world-layer" aria-hidden>
        <World3D />
      </div>

      {/* Sidebar (top-left floating action button) */}
      <Sidebar />

      {/* Glassy feed viewport over the 3D world */}
      <main className="feed-viewport">
        <Feed />
      </main>

      {/* Bottom UI elements */}
      <ChatDock />
      <AssistantOrb onPortal={onPortal} />
    </>
  );
}
