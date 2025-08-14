import React, { useEffect, useState } from "react";
import bus from "../lib/bus";
import { importContent, repostContent } from "../hooks/useShare";
import type { Platform } from "../lib/repost";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "x", label: "X" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
];

function useLocal<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, v]);
  return [v, setV] as const;
}

export default function IntegrationSettings() {
  const [connected, setConnected] = useLocal<Record<Platform, boolean>>("sn.integrations", {
    x: false,
    facebook: false,
    linkedin: false,
  });

  const toggle = (p: Platform, value: boolean) => {
    setConnected({ ...connected, [p]: value });
    bus.emit("toast", value ? `${p} connected` : `${p} disconnected`);
  };

  const handleImport = async (p: Platform) => {
    await importContent(p);
  };

  const handleRepost = async (p: Platform) => {
    await repostContent(p, "Hello from superNova_2177");
  };

  return (
    <section className="card">
      <header>Integrations</header>
      {PLATFORMS.map(({ id, label }) => (
        <div className="row key" key={id}>
          <div className="klabel">{label}</div>
          <div className="status">{connected[id] ? "connected" : "disconnected"}</div>
          {connected[id] ? (
            <>
              <button className="icon" onClick={() => handleImport(id)} title="Import">⬇️</button>
              <button className="icon" onClick={() => handleRepost(id)} title="Repost">🔁</button>
              <button className="icon danger" onClick={() => toggle(id, false)} title="Disconnect">✕</button>
            </>
          ) : (
            <button className="pill" onClick={() => toggle(id, true)}>Connect</button>
          )}
        </div>
      ))}
    </section>
  );
}
