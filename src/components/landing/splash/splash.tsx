"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import styles from "./splash.module.css";

/**
 * Cinematic first-visit intro, ported from
 * design-reference/splash-cinematic-v3.html. The particle physics, phase
 * timings, and colors are verbatim — the reference is the contract. What the
 * port adds is everything the standalone page never needed: a real exit
 * (Enter/SKIP/Escape fade the overlay out and hand back to the landing),
 * cancellation of the rAF loop and every timeout on unmount, removal of the
 * resize listener, and a body scroll lock. The reference's Replay button was
 * a design-review affordance and is dropped.
 *
 * Only mounted by SplashGate, which guarantees prefers-reduced-motion users
 * and returning visitors never load this chunk.
 */

// Brand blue stays the core during buildup; the blast throws in electric cyan,
// magenta, gold and violet for a wilder, more spectacular burst.
const COLORS = [
  "#6EA8FE",
  "#3B82F6",
  "#8FB6FF",
  "#A78BFA",
  "#2B59E0",
  "#EAF2FF",
  "#C9DBFF",
];
const BOOM_COLORS = [
  "#22D3EE",
  "#38BDF8",
  "#818CF8",
  "#A78BFA",
  "#E879F9",
  "#F0ABFC",
  "#FBBF24",
  "#FDE68A",
  "#EAF2FF",
  "#6EA8FE",
];

// Pre-render one glowing dot per colour as a sprite. Drawing an image is
// cheap; ctx.shadowBlur per particle per frame is not — with ~500 particles
// plus embers it was the stall.
const SPRITES: Record<string, HTMLCanvasElement> = {};
function makeSprite(color: string) {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grd.addColorStop(0, color);
  grd.addColorStop(0.35, color);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  g.fill();
  return c;
}
function sprite(color: string) {
  if (!SPRITES[color]) SPRITES[color] = makeSprite(color);
  return SPRITES[color];
}

const EXIT_FADE_MS = 350;

type Particle = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  ex: number;
  ey: number;
  r: number;
  c: string;
  seed: number;
  life: number;
  streak: boolean;
};

type Ember = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  life: number;
  seed: number;
};

type Phase = "converge" | "hold" | "boom" | "settle" | "done";

export default function Splash({ onDone }: { onDone: () => void }) {
  const [closing, setClosing] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const vigRef = useRef<HTMLDivElement>(null);
  const r1Ref = useRef<HTMLDivElement>(null);
  const r2Ref = useRef<HTMLDivElement>(null);
  const r3Ref = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);

  const closingRef = useRef(false);

  const dismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    // Fires after the gate unmounts us — that's its job; it must not be
    // cleared by the effect cleanup below.
    window.setTimeout(() => onDone(), EXIT_FADE_MS);
  };

  // Escape handling lives in the mount effect below; the ref keeps it pointed
  // at the current render's dismiss without re-running that effect.
  const dismissRef = useRef<() => void>(() => {});
  useEffect(() => {
    dismissRef.current = dismiss;
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) {
      // No canvas, no show — hand back to the landing on the next tick.
      const bail = window.setTimeout(() => dismissRef.current(), 0);
      return () => clearTimeout(bail);
    }
    const bgEl = bgRef.current;
    const vigEl = vigRef.current;
    const flashEl = flashRef.current;
    const ringEls = [r1Ref.current, r2Ref.current, r3Ref.current];
    const markEl = markRef.current;
    const sweepEl = sweepRef.current;
    const tagEl = tagRef.current;
    const enterEl = enterRef.current;

    let disposed = false;
    let rafId = 0;
    const timeouts: number[] = [];

    let W = 0;
    let H = 0;
    let DPR = 1;
    let cx = 0;
    let cy = 0;
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * DPR;
      canvas!.height = H * DPR;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      cx = W / 2;
      cy = H * 0.46;
    }

    // ---------- ECG / heartbeat waveform target ----------
    function pulseTargets() {
      const pts: { x: number; y: number }[] = [];
      const span = Math.min(W * 0.74, 860);
      const x0 = cx - span / 2;
      const x1 = cx + span / 2;
      const baseY = cy;
      const amp = Math.min(H, W) * 0.17;
      const step = 3.4; // denser
      function wave(u: number) {
        let y = 0;
        y += Math.exp(-Math.pow((u - 0.4) / 0.02, 2)) * 0.18; // P
        y -= Math.exp(-Math.pow((u - 0.475) / 0.01, 2)) * 0.38; // Q
        y += Math.exp(-Math.pow((u - 0.5) / 0.008, 2)) * 1.05; // R (big spike)
        y -= Math.exp(-Math.pow((u - 0.525) / 0.01, 2)) * 0.48; // S
        y += Math.exp(-Math.pow((u - 0.62) / 0.028, 2)) * 0.32; // T
        return y;
      }
      for (let x = x0; x <= x1; x += step) {
        const u = (x - x0) / span;
        const y = baseY - wave(u) * amp;
        pts.push({ x, y });
        if (Math.abs(u - 0.5) < 0.14) {
          pts.push({ x, y: y - 3.4 });
          pts.push({ x, y: y + 3.4 });
        }
      }
      return pts;
    }

    let particles: Particle[] = [];
    let embers: Ember[] = [];

    function makeParticles() {
      particles = pulseTargets().map((t) => {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.max(W, H) * (0.65 + Math.random() * 0.85);
        return {
          x: cx + Math.cos(ang) * dist,
          y: cy + Math.sin(ang) * dist,
          tx: t.x,
          ty: t.y,
          vx: 0,
          vy: 0,
          ex: Math.cos(ang),
          ey: Math.sin(ang),
          r: 1.0 + Math.random() * 2.2,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          seed: Math.random() * Math.PI * 2,
          life: 1,
          // charge streak flag: a subset leave energy trails while converging
          streak: Math.random() < 0.22,
        };
      });
    }

    // embers: extra sparks spawned at the boom that drift and twinkle
    function spawnEmbers() {
      embers = [];
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 4 + Math.random() * 18;
        embers.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          r: 0.8 + Math.random() * 1.8,
          c: BOOM_COLORS[(Math.random() * BOOM_COLORS.length) | 0],
          life: 1,
          seed: Math.random() * 6,
        });
      }
    }

    let phase: Phase = "converge";
    let t0 = 0;
    let scanX = 0;
    let shakeAmp = 0;

    function kickShake(a: number) {
      shakeAmp = Math.max(shakeAmp, a);
    }
    function applyShake() {
      if (shakeAmp > 0.2) {
        const dx = (Math.random() - 0.5) * shakeAmp;
        const dy = (Math.random() - 0.5) * shakeAmp;
        const rot = (Math.random() - 0.5) * shakeAmp * 0.06;
        root!.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg)`;
        shakeAmp *= 0.87;
      } else {
        root!.style.transform = "none";
        shakeAmp = 0;
      }
    }

    function fireBoom() {
      flashEl?.classList.add(styles.fire);
      ringEls.forEach((el) => el?.classList.add(styles.fire));
      if (vigEl) vigEl.style.opacity = ".2";
      kickShake(48); // heavy jolt
      spawnEmbers();
      particles.forEach((p) => {
        // recolor to a wild hue only now — the heartbeat was brand blue,
        // the blast is a rainbow
        p.c = BOOM_COLORS[(Math.random() * BOOM_COLORS.length) | 0];
        const spd = 10 + Math.random() * 20;
        p.vx = p.ex * spd + (Math.random() - 0.5) * 5;
        p.vy = p.ey * spd + (Math.random() - 0.5) * 5;
        p.life = 1;
      });
      timeouts.push(
        window.setTimeout(() => {
          if (disposed) return;
          markEl?.classList.add(styles.reveal);
          tagEl?.classList.add(styles.reveal);
        }, 90),
        window.setTimeout(() => {
          if (disposed) return;
          sweepEl?.classList.add(styles.go);
        }, 1100),
        window.setTimeout(() => {
          if (disposed) return;
          enterEl?.classList.add(styles.reveal);
        }, 1300),
      );
    }

    function drawDot(p: Particle, glow: number) {
      const a = Math.max(0, Math.min(1, p.life));
      // Sprite size carries the glow pulse that shadowBlur used to.
      const d = p.r * 7 * (0.6 + glow * 0.5);
      ctx!.globalAlpha = a;
      ctx!.drawImage(sprite(p.c), p.x - d / 2, p.y - d / 2, d, d);
      ctx!.globalAlpha = 1;
    }

    function drawScan() {
      const span = Math.min(W * 0.74, 860);
      const x0 = cx - span / 2;
      const x1 = cx + span / 2;
      scanX += (x1 - x0) / 55;
      if (scanX > x1) scanX = x0;
      ctx!.save();
      ctx!.globalAlpha = 0.95;
      const d = 26;
      ctx!.drawImage(sprite("#EAF2FF"), scanX - d / 2, cy - d / 2, d, d);
      // faint vertical scan line
      ctx!.globalAlpha = 0.1;
      ctx!.strokeStyle = "#6EA8FE";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(scanX, cy - H * 0.22);
      ctx!.lineTo(scanX, cy + H * 0.22);
      ctx!.stroke();
      ctx!.restore();
    }

    function loop(now: number) {
      const t = now - t0;
      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter";
      applyShake();

      if (phase === "converge") {
        let settled = 0;
        particles.forEach((p) => {
          const px = p.x;
          const py = p.y;
          p.x += (p.tx - p.x) * 0.09;
          p.y += (p.ty - p.y) * 0.09;
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          if (dx * dx + dy * dy < 4) settled++;
          // energy streak: draw a short trail behind fast movers
          if (p.streak) {
            ctx!.strokeStyle = p.c;
            ctx!.globalAlpha = 0.3;
            ctx!.lineWidth = 1.4;
            ctx!.beginPath();
            ctx!.moveTo(px, py);
            ctx!.lineTo(p.x, p.y);
            ctx!.stroke();
            ctx!.globalAlpha = 1;
          }
          const s = 0.6 + Math.sin(now * 0.007 + p.seed) * 0.4;
          drawDot(p, s);
        });
        drawScan();
        // ramp brightness + tighten vignette as energy gathers
        if (t > 500) {
          bgEl?.classList.add(styles.charge);
          if (vigEl) vigEl.style.opacity = ".75";
        }
        if (t > 900 && settled > particles.length * 0.9) {
          phase = "hold";
          t0 = now;
        }
      } else if (phase === "hold") {
        particles.forEach((p) => {
          p.x += (p.tx - p.x) * 0.25 + (Math.random() - 0.5) * 0.5;
          p.y += (p.ty - p.y) * 0.25 + (Math.random() - 0.5) * 0.5;
          const s = 1.0 + Math.sin(now * 0.05 + p.seed) * 0.7;
          drawDot(p, s);
        });
        kickShake(Math.min(9, (t / 380) * 9)); // rising anticipation rumble
        if (t > 380) {
          phase = "boom";
          t0 = now;
          fireBoom();
        }
      } else if (phase === "boom" || phase === "settle") {
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.93;
          p.vy *= 0.93;
          p.vy += 0.06;
          p.life *= 0.965;
          drawDot(p, p.life * 1.6);
        });
        embers.forEach((e) => {
          e.x += e.vx;
          e.y += e.vy;
          e.vx *= 0.95;
          e.vy *= 0.95;
          e.vy += 0.04;
          e.life *= 0.972;
          const tw = 0.5 + Math.sin(now * 0.02 + e.seed) * 0.5;
          const d = e.r * 7;
          ctx!.globalAlpha = e.life * tw;
          ctx!.drawImage(sprite(e.c), e.x - d / 2, e.y - d / 2, d, d);
          ctx!.globalAlpha = 1;
        });
        if (t > 160) phase = "settle";
        if (phase === "settle" && t > 2600) phase = "done";
      }

      if (phase !== "done") {
        rafId = requestAnimationFrame(loop);
      } else {
        ctx!.clearRect(0, 0, W, H);
        root!.style.transform = "none";
      }
    }

    resize();
    window.addEventListener("resize", resize);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissRef.current();
    };
    window.addEventListener("keydown", onKey);

    // The landing must not scroll underneath the overlay.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // start (reference's start(), minus the replay-only resetVisuals)
    [...COLORS, ...BOOM_COLORS].forEach(sprite); // warm the cache off the hot path
    makeParticles();
    phase = "converge";
    t0 = performance.now();
    scanX = cx - Math.min(W * 0.74, 860) / 2;
    bgEl?.classList.add(styles.on);
    rafId = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      timeouts.forEach((id) => clearTimeout(id));
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(styles.root, closing && styles.closing)}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to SehatBook"
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div ref={bgRef} className={styles.bg} aria-hidden="true" />
      <div ref={vigRef} className={styles.vig} aria-hidden="true" />
      <div
        ref={r1Ref}
        className={cn(styles.ring, styles.r1)}
        aria-hidden="true"
      />
      <div
        ref={r2Ref}
        className={cn(styles.ring, styles.r2)}
        aria-hidden="true"
      />
      <div
        ref={r3Ref}
        className={cn(styles.ring, styles.r3)}
        aria-hidden="true"
      />
      <div ref={flashRef} className={styles.flash} aria-hidden="true" />
      <div className={styles.lockup}>
        <div className={styles.markwrap}>
          <div ref={markRef} className={styles.mark}>
            Sehat<span>Book</span>
          </div>
          <div ref={sweepRef} className={styles.sweep} aria-hidden="true" />
        </div>
        <div ref={tagRef} className={styles.tagline}>
          Healthcare, one click away.
        </div>
      </div>
      <button
        ref={enterRef}
        type="button"
        className={styles.enter}
        onClick={dismiss}
      >
        Enter
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
      <button
        type="button"
        className={styles.skip}
        onClick={dismiss}
        autoFocus
        aria-label="Skip intro"
      >
        SKIP
      </button>
    </div>
  );
}
