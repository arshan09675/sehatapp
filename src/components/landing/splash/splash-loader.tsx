"use client";

import dynamic from "next/dynamic";

// ssr: false must live in a Client Component (Next errors otherwise). The gate
// is client-only so it can read localStorage in its first render — there is no
// server HTML to mismatch. The heavy canvas chunk sits behind a second dynamic
// import inside the gate and is only fetched when the splash actually shows.
const SplashGate = dynamic(() => import("./splash-gate"), { ssr: false });

export default function SplashLoader() {
  return <SplashGate />;
}
