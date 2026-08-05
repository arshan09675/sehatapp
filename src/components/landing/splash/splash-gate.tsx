"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SPLASH_SEEN_KEY = "sehatbook:splash-seen";

// Fetched only when the gate decides to show — returning visitors download
// none of the splash code.
const Splash = dynamic(() => import("./splash"), { ssr: false });

/**
 * Shows the cinematic intro exactly once, on a visitor's first arrival at the
 * landing (deep links never mount this). Client-only via splash-loader, so the
 * lazy initializer runs in the browser on the first render — reading persisted
 * state without a hydration mismatch or an effect-driven double render.
 */
export default function SplashGate() {
  const [show, setShow] = useState(() => {
    // Reduced motion means no intro animation at all — straight to the landing.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
    try {
      return localStorage.getItem(SPLASH_SEEN_KEY) === null;
    } catch {
      // Storage unavailable (private mode, blocked): never showing beats
      // replaying on every visit.
      return false;
    }
  });

  useEffect(() => {
    if (!show) return;
    // Flagged when it shows, not when it finishes — a refresh mid-splash must
    // not replay it.
    try {
      localStorage.setItem(SPLASH_SEEN_KEY, new Date().toISOString());
    } catch {
      // A blocked write means the splash may replay next visit; harmless.
    }
  }, [show]);

  if (!show) return null;
  return <Splash onDone={() => setShow(false)} />;
}
