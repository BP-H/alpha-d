// src/components/Shell.tsx
import AssistantOrb from "./AssistantOrb";
import World3D from "./World3D";
import Feed from "./feed/Feed";
import ChatDock from "./ChatDock";
import BrandBadge from "./BrandBadge";
import { me as defaultMe } from "../lib/placeholders";
import type { User } from "../types";

type Props = {
  me?: User;
  onEnterWorld?: () => void;
};

export default function Shell({ me = defaultMe, onEnterWorld = () => {} }: Props) {
  return (
    <>
      {/* 3D world background, cannot steal pointer/touch */}
      <div className="world-layer" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <World3D selected={null} onBack={() => {}} />
      </div>

      {/* Foreground content */}
      <div className="content-viewport" style={{ height: "100dvh", overflow: "auto", position: "relative", zIndex: 10 }}>
        <div className="feed-wrap" style={{ padding: "8px 0 80px" }}>
          <Feed me={me} onOpenProfile={() => {}} onEnterWorld={onEnterWorld} />
        </div>
      </div>

      {/* Brand (top-left), chat and orb (top UI layer) */}
      <BrandBadge />
      <ChatDock />
      <AssistantOrb />
    </>
  );
}
