// src/components/Shell.tsx
import React from "react";
import Feed from "./feed/Feed";
import AssistantOrb from "./AssistantOrb";
import ChatDock from "./ChatDock";

export default function Shell() {
  return (
    <>
      {/* Scrollable feed viewport */}
      <div className="content-viewport">
        <main className="feed-wrap">
          <div className="feed-content">
            <Feed />
          </div>
        </main>
      </div>

      {/* Floating helpers */}
      <AssistantOrb />
      <ChatDock />
    </>
  );
}
