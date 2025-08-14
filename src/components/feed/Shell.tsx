// src/components/feed/Shell.tsx
import Feed from "./Feed";
import AssistantOrb from "../AssistantOrb";
import ChatDock from "../ChatDock";
import Sidebar from "../Sidebar";
import World3D from "../World3D";

export default function FeedShell() {
  return (
    <>
      <div className="world-layer" aria-hidden>
        <World3D selected={null} onBack={() => {}} />
      </div>
      <Sidebar />
      <main className="feed-viewport">
        <Feed />
      </main>
      <ChatDock />
      <AssistantOrb />
    </>
  );
}
