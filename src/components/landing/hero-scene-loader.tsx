"use client";

import dynamic from "next/dynamic";

// ssr: false must live in a Client Component (Next errors otherwise) — the
// Three.js scene is browser-only and must never block the server render.
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

export default function HeroSceneLoader() {
  return <HeroScene />;
}
