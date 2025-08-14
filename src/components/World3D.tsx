// src/components/World3D.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, Instances, Instance, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Post } from "../types";
import bus from "../lib/bus";
import { WorldState, defaultWorld, clampWorld } from "../lib/world";
import { fetchPlayers } from "../lib/api";

type Player = { id: string; name: string; color: string };

/** Exported — used elsewhere */
export function ringPositions(count: number) {
  const arr: [number, number, number][] = [];
  const r = 7.2;
  const n = Math.max(1, count);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    arr.push([Math.cos(a) * r, Math.sin(a) * 0.6, -10 - (i % 3) * 0.35]);
  }
  return arr;
}

/** Exported — used elsewhere */
export function FloorGrid({ color, opacity }: { color: string; opacity: number }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(240, 240, 120, 120), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, -8]} geometry={geo}>
      <meshBasicMaterial color={color} wireframe transparent opacity={opacity} />
    </mesh>
  );
}

export default function World3D({ selected, onBack }: { selected: Post | null; onBack: () => void }) {
  const [w, setW] = useState<WorldState>(defaultWorld);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(
    () => bus.on("world:update", (p: Partial<WorldState>) => setW((s) => clampWorld({ ...s, ...p }))),
    []
  );
  useEffect(() => { fetchPlayers().then(setPlayers).catch(() => setPlayers([])); }, []);

  const bg = w.theme === "dark" ? "#0b0d12" : "#f6f8fb";
  const fogC = w.theme === "dark" ? "#0b0d12" : "#f1f4fa";
  const gridC = w.theme === "dark" ? "#283044" : "#e5eaf4";
  const fogNear = 12 + w.fogLevel * 6;
  const fogFar = 44 - w.fogLevel * 16;

  const N = players.length || w.orbCount;
  const positions = useMemo(() => ringPositions(N), [N]);

  return (
    <div className="world-wrap" style={{ position: "relative" }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.2, 7], fov: 50 }} style={{ height: "100vh" }}>
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[fogC, fogNear, fogFar]} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[5, 8, 3]} intensity={0.65} />
        <FloorGrid color={gridC} opacity={w.gridOpacity} />
        <Instances limit={128}>
          <sphereGeometry args={[0.26, 32, 32]} />
          <meshStandardMaterial
            color={"#d1d5db"}               // neutral steel
            emissive={w.theme === "dark" ? "#22d3ee" : "#67e8f9"}
            emissiveIntensity={0.12}
            roughness={0.25}
            metalness={0.55}
          />
          {positions.map((p, i) => {
            const c = players[i]?.color || w.orbColor || "#7dd3fc";
            return (
              <Float key={i} floatIntensity={0.6} rotationIntensity={0.25} speed={0.9 + (i % 4) * 0.15}>
                <Instance position={p} color={c} />
              </Float>
            );
          })}
        </Instances>
        <OrbitControls enablePan={false} />
      </Canvas>

      {/* Bottom glass bar */}
      <div className="world-bottombar">
        <button className="pill" onClick={onBack}>Back to Feed</button>
        {selected && <span className="crumb">Portal • {selected.title}</span>}
      </div>
    </div>
  );
}
