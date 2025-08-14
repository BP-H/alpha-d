import React from "react";
import Feed from "./feed/Feed";
import Sidebar from "./Sidebar";
import World3D from "./World3D";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock"; // keep for future
import Topbar from "./Topbar";
import AvatarPortal from "./AvatarPortal";
import "./Shell.css";

export default function Shell() {
  return (
    <>
      <div className="world-layer" aria-hidden>
        <World3D />
      </div>

      <Topbar />
      <Sidebar />
      <AvatarPortal />

      <main className="feed-viewport">
        <Feed />
      </main>

      <ChatDock />
      <AssistantOrb />
    </>
  );
}
