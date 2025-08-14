// src/three/BackgroundVoid.tsx
import { Canvas } from "@react-three/fiber";
import { Float, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import bus from "../lib/bus";
import { WorldState, defaultWorld, clampWorld } from "../lib/world";

function ringPositions(count: number) {
  const arr: [number, number, number][] = [];
  const r = 7.2;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    arr.push([Math.cos(a) * r, Math.sin(a) * 0.6, -10 - (i % 3) * 0.35]);
  }
  return arr;
}

function FloorGrid({ color, opacity }: { color: string; opacity: number }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(240, 240, 120, 120), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, -8]} geometry={geo}>
      <meshBasicMaterial color={color} wireframe transparent opacity={opacity} />
    </mesh>
  );
}

export default function BackgroundVoid() {
  const [w, setW] = useState<WorldState>(defaultWorld);

  // listen for updates from the orb
  useEffect(() => {
    return bus.on("world:update", (patch: Partial<WorldState>) => {
      setW((prev) => clampWorld({ ...prev, ...patch }));
    });
  }, []);

  const bg = w.theme === "dark" ? "#0b0d12" : "#f6f8fb";
  const fogC = w.theme === "dark" ? "#0b0d12" : "#f1f4fa";
  const gridC = w.theme === "dark" ? "#283044" : "#e5eaf4";
  const fogNear = 12 + w.fogLevel * 6;
  const fogFar = 44 - w.fogLevel * 16;

  const positions = useMemo(() => ringPositions(w.orbCount), [w.orbCount]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.2, 7], fov: 50 }}>
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[fogC, fogNear, fogFar]} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[5, 8, 3]} intensity={0.65} />
        <FloorGrid color={gridC} opacity={w.gridOpacity} />
        <Instances limit={64}>
          <sphereGeometry args={[0.26, 32, 32]} />
          <meshStandardMaterial
            color={w.orbColor}
            emissive={w.theme === "dark" ? "#6b72ff" : "#b6bcff"}
            emissiveIntensity={0.16}
            roughness={0.25}
            metalness={0.55}
          />
          {positions.map((p, i) => (
            <Float key={i} floatIntensity={0.6} rotationIntensity={0.25} speed={0.9 + (i % 4) * 0.15}>
              <Instance position={p} />
            </Float>
          ))}
        </Instances>
      </Canvas>
    </div>
  );
}
