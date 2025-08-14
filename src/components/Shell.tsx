// src/components/Shell.tsx
import React from "react";
import Feed from "./feed/Feed";
import World3D from "./World3D";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import PortalOverlay from "./PortalOverlay";
import PostComposer from "./PostComposer";

export default function Shell() {
  return (
    <>
      <div className="world-layer" aria-hidden>
        <World3D />
      </div>

      <Topbar />
      <Sidebar />
      <PortalOverlay />

      {/* Use the same scroll container classes the feed CSS targets */}
      <main className="content-viewport feed-wrap">
        {/* Composer sits in the same centered grid width as posts */}
        <div className="feed-content">
          <div className="post-composer">
            <PostComposer />
          </div>
        </div>

        {/* The actual infinite feed */}
        <Feed />
      </main>

      <ChatDock />
      <AssistantOrb />
    </>
  );
}
