// src/App.tsx
import React from "react";
import Shell from "./components/Shell";

// Global styles
import "./styles.css";     // reset + theme + orb + chatdock + layout
import "./feed.css";       // feed container grid
import "./postcard.css";   // your full-bleed PostCard styling (frost bars, chips)

export default function App() {
  return <Shell />;
}
