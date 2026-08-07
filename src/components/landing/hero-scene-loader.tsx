"use client";

import dynamic from "next/dynamic";

import { ErrorBoundary } from "./error-boundary";
import { HeroSceneFallback } from "./hero-scene-fallback";

// ssr: false must live in a Client Component (Next errors otherwise) — the
// Three.js scene is browser-only and must never block the server render.
// `loading` covers the seconds the ~2.3 MB three chunk spends downloading, so
// the hero shows its background immediately instead of a void.
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <HeroSceneFallback />,
});

/**
 * The two ways the scene can fail need different handling, so both are wired
 * up here:
 *
 *  - the chunk never arrives (offline, or a cache miss against a dev server
 *    that restarted) — next/dynamic throws, and the boundary catches it;
 *  - WebGL is missing or the context dies at runtime — that happens inside an
 *    effect, where a boundary cannot see it, so HeroScene swaps to the same
 *    fallback itself.
 */
export default function HeroSceneLoader() {
  return (
    <ErrorBoundary label="hero-scene" fallback={<HeroSceneFallback />}>
      <HeroScene />
    </ErrorBoundary>
  );
}
