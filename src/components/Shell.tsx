// src/components/Shell.tsx
import React from "react";
import Feed from "./feed/Feed";
import World3D from "./World3D";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import PortalOverlay from "./PortalOverlay";

export default function Shell() {
  return (
    <>
      <div className="world-layer" aria-hidden>
        <World3D />
      </div>

      <Topbar />
      <Sidebar />
      <PortalOverlay />

      <main className="feed-viewport">
        <Feed />
      </main>

      <ChatDock />
      <AssistantOrb />
    </>
  );
}
