import { cn } from "@/lib/utils";

/**
 * Static stand-in for the Three.js hero scene. It shows while the ~2.3 MB
 * three chunk downloads, and stays put permanently when WebGL is unavailable
 * or the scene fails to start.
 *
 * The hero's right half carries no copy — the 3D scene is the only thing in
 * it. Without a stand-in, every failure mode reads as a blank void rather than
 * a background, which is exactly how "sometimes the hero just isn't there"
 * gets reported.
 *
 * Pure CSS on purpose: nothing here can fail the way the thing it replaces
 * just did, and it costs no main-thread work on the machines least able to
 * afford it. Geometry mirrors hero-scene.tsx — a 3.6 x 1.15 cross centred on
 * the point the 3D camera looks at, inside the same blue core glow.
 */
export function HeroSceneFallback({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 z-0", className)}
    >
      {/* outer halo — the sprite glow behind the core */}
      <div className="absolute top-1/2 left-1/2 size-[min(78vw,640px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(110,168,254,0.20)_0%,rgba(59,130,246,0.10)_36%,transparent_70%)]" />

      {/* the glass cross, reduced to a blurred silhouette */}
      <div className="absolute top-1/2 left-1/2 size-[min(42vh,340px)] -translate-x-1/2 -translate-y-1/2 blur-[14px]">
        <div className="absolute inset-y-0 left-1/2 w-[32%] -translate-x-1/2 rounded-[12px] bg-[linear-gradient(160deg,rgba(234,240,255,0.26),rgba(59,130,246,0.14)_55%,rgba(30,64,196,0.09))]" />
        <div className="absolute inset-x-0 top-1/2 h-[32%] -translate-y-1/2 rounded-[12px] bg-[linear-gradient(160deg,rgba(234,240,255,0.26),rgba(59,130,246,0.14)_55%,rgba(30,64,196,0.09))]" />
      </div>

      {/* gem core */}
      <div className="absolute top-1/2 left-1/2 size-[min(24vw,190px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(160,195,255,0.28)_0%,rgba(90,130,240,0.13)_45%,transparent_72%)]" />
    </div>
  );
}
