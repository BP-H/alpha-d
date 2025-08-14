// src/components/AvatarPortal.tsx
import React, { useEffect, useState } from "react";
import bus from "../lib/bus";
import "./AvatarPortal.css";

export default function AvatarPortal(){
  const [on, setOn] = useState(false);
  useEffect(() => bus.on("avatar-portal:open", () => { setOn(true); setTimeout(()=>setOn(false), 900); }), []);
  return on ? (
    <div className="avatar-portal">
      <div className="ap-splash" />
      <div className="ap-ring" />
    </div>
  ) : null;
}
