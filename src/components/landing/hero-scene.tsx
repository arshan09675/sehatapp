"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";
import { HeroSceneFallback } from "./hero-scene-fallback";

/**
 * Landing hero 3D scene — 1:1 port of the reference's Three.js background
 * (glass medical cross + gem core, glow halo, particle rings, node network,
 * floating pills, dust, pointer parallax). Written against modern three
 * (the reference targeted r128): outputEncoding/sRGBEncoding became
 * outputColorSpace/SRGBColorSpace, canvas textures need an explicit
 * colorSpace, and Clock is deprecated in favour of Timer.
 *
 * three is a bundled npm dependency (`import * as THREE from "three"`), so the
 * scene is served from the app's own /_next/static chunks. It never depends on
 * a third-party CDN being reachable.
 *
 * Every failure path here ends at HeroSceneFallback rather than at an empty
 * screen: no WebGL, a throw during setup, a lost context. The canvas is also
 * created per mount instead of being rendered by React — see the comment in
 * the effect.
 */

type Status = "pending" | "ready" | "failed";

export default function HeroScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("pending");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // A fresh canvas per mount, created here rather than rendered by React.
    // A canvas hands out one WebGL context for its whole life, so reusing the
    // element across mounts gives the second renderer the first one's context
    // — already torn down by the first cleanup. Strict Mode remounts every
    // effect in development and HMR does it again on every edit, so that is
    // the common path, not an edge case.
    const canvas = document.createElement("canvas");
    canvas.className = "block size-full";
    host.appendChild(canvas);

    const fail = (reason: string, error?: unknown) => {
      console.error(`[hero-scene] ${reason}`, error ?? "");
      setStatus("failed");
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
    } catch (error) {
      canvas.remove();
      fail("WebGL unavailable", error);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      46,
      innerWidth / innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 14);

    // environment (blue reflections)
    function envTex() {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      const x = c.getContext("2d")!;
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#12224a");
      g.addColorStop(0.42, "#2a4fb0");
      g.addColorStop(0.55, "#dbe6ff");
      g.addColorStop(0.7, "#3552c9");
      g.addColorStop(1, "#0a1330");
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 256);
      const rg = x.createRadialGradient(360, 68, 10, 360, 68, 140);
      rg.addColorStop(0, "rgba(255,255,255,.9)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = rg;
      x.fillRect(0, 0, 512, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.mapping = THREE.EquirectangularReflectionMapping;
      return t;
    }
    let envMap: THREE.Texture | null = null;
    let envSource: THREE.Texture | null = null;
    let pmrem: THREE.PMREMGenerator | null = null;
    try {
      pmrem = new THREE.PMREMGenerator(renderer);
      envSource = envTex();
      envMap = pmrem.fromEquirectangular(envSource).texture;
      scene.environment = envMap;
    } catch (error) {
      // Reflections are a nicety — the scene still reads flat-lit without
      // them, so this downgrades rather than falling back.
      console.warn("[hero-scene] environment map unavailable", error);
    }

    scene.add(new THREE.AmbientLight(0x9fb4e0, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(3, 5, 4);
    scene.add(key);
    const blue = new THREE.PointLight(0x3b82f6, 1.6, 44);
    blue.position.set(7, 4, 6);
    scene.add(blue);
    const violet = new THREE.PointLight(0x8b5cf6, 0.9, 44);
    violet.position.set(-7, -3, 3);
    scene.add(violet);
    const amber = new THREE.DirectionalLight(0xf59e0b, 0.35);
    amber.position.set(-4, 2, -3);
    scene.add(amber);

    function glowTex() {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const x = c.getContext("2d")!;
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(160,195,255,1)");
      g.addColorStop(0.25, "rgba(90,130,240,.55)");
      g.addColorStop(1, "rgba(60,90,220,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    const GLOW = glowTex();
    function sprite(s: number, o: number) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: GLOW,
          color: 0x4f7df0,
          transparent: true,
          opacity: o,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sp.scale.setScalar(s);
      return sp;
    }

    const core = new THREE.Group();
    scene.add(core);
    const halo = sprite(9, 0.5);
    halo.position.z = -1.2;
    core.add(halo);
    const crossMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.16,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      emissive: 0x1e40c4,
      emissiveIntensity: 0.22,
      envMap,
      envMapIntensity: 1.3,
    });
    core.add(new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.6, 1.15), crossMat));
    core.add(new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.15, 1.15), crossMat));
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.MeshPhysicalMaterial({
        color: 0x6ea8fe,
        roughness: 0.05,
        metalness: 0.1,
        clearcoat: 1,
        transparent: true,
        opacity: 0.92,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.5,
        envMap,
        envMapIntensity: 1.6,
      }),
    );
    core.add(gem);

    function ring(radius: number, count: number, tilt: number, tiltY: number) {
      const g = new THREE.Group();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * radius;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = Math.sin(a) * radius;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.add(
        new THREE.Points(
          geo,
          new THREE.PointsMaterial({
            map: GLOW,
            color: 0x8fb6ff,
            size: 0.28,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      g.rotation.x = tilt;
      g.rotation.y = tiltY;
      return g;
    }
    const ring1 = ring(4.6, 60, Math.PI / 2.4, 0.3);
    scene.add(ring1);
    const ring2 = ring(5.6, 80, Math.PI / 2.1, -0.5);
    scene.add(ring2);

    // node network sphere
    const net = new THREE.Group();
    scene.add(net);
    const N = 46,
      R = 3.6;
    const pts: THREE.Vector3[] = [];
    const nodeGeo = new THREE.SphereGeometry(0.075, 12, 12);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xeaf0ff,
      emissive: 0x6ea8fe,
      emissiveIntensity: 0.7,
      roughness: 0.4,
      envMap,
      envMapIntensity: 1,
    });
    const gp: number[] = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2,
        r = Math.sqrt(1 - y * y),
        phi = i * Math.PI * (3 - Math.sqrt(5));
      const p = new THREE.Vector3(
        Math.cos(phi) * r,
        y,
        Math.sin(phi) * r,
      ).multiplyScalar(R);
      pts.push(p);
      const m = new THREE.Mesh(nodeGeo, nodeMat);
      m.position.copy(p);
      net.add(m);
      gp.push(p.x, p.y, p.z);
    }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
    net.add(
      new THREE.Points(
        ng,
        new THREE.PointsMaterial({
          map: GLOW,
          color: 0x6ea8fe,
          size: 0.5,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    const lp: number[] = [];
    for (let i = 0; i < N; i++) {
      const d = pts
        .map((q, j) => ({ j, dist: pts[i].distanceTo(q) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(1, 3);
      d.forEach(({ j }) =>
        lp.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z),
      );
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    net.add(
      new THREE.LineSegments(
        lg,
        new THREE.LineBasicMaterial({
          color: 0x5b8cff,
          transparent: true,
          opacity: 0.13,
        }),
      ),
    );

    // floating pills
    type PillData = {
      ang: number;
      rad: number;
      y: number;
      sp: number;
      spin: number;
      ax: THREE.Vector3;
      bob: number;
    };
    const pills: THREE.Group[] = [];
    function makePill() {
      const g = new THREE.Group();
      const white = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.05,
        clearcoat: 0.8,
        envMap,
        envMapIntensity: 1,
      });
      const tint = new THREE.MeshPhysicalMaterial({
        color: 0x5b8cff,
        roughness: 0.25,
        metalness: 0.05,
        clearcoat: 0.8,
        emissive: 0x1e40c4,
        emissiveIntensity: 0.25,
        envMap,
        envMapIntensity: 1,
      });
      g.add(
        new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 20), white),
      );
      const capT = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        white,
      );
      capT.position.y = 0.25;
      const capB = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.2,
          16,
          16,
          0,
          Math.PI * 2,
          Math.PI / 2,
          Math.PI / 2,
        ),
        tint,
      );
      capB.position.y = -0.25;
      const half = new THREE.Mesh(
        new THREE.CylinderGeometry(0.201, 0.201, 0.25, 20),
        tint,
      );
      half.position.y = -0.125;
      g.add(capT, capB, half);
      g.scale.setScalar(0.75 + Math.random() * 0.7);
      return g;
    }
    for (let i = 0; i < 8; i++) {
      const p = makePill();
      const ang = Math.random() * Math.PI * 2,
        rad = 5.5 + Math.random() * 4;
      p.userData = {
        ang,
        rad,
        y: (Math.random() - 0.5) * 8,
        sp: 0.06 + Math.random() * 0.1,
        spin: 0.3 + Math.random() * 0.6,
        ax: new THREE.Vector3(
          Math.random(),
          Math.random(),
          Math.random(),
        ).normalize(),
        bob: Math.random() * 6,
      } satisfies PillData;
      p.position.set(
        Math.cos(ang) * rad,
        p.userData.y,
        Math.sin(ang) * rad - 2,
      );
      pills.push(p);
      scene.add(p);
    }

    // dust layers
    function dust(
      count: number,
      size: number,
      opacity: number,
      spread: number,
      depth: number,
    ) {
      const g = new THREE.BufferGeometry(),
        a = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        a[i * 3] = (Math.random() - 0.5) * spread;
        a[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7;
        a[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.7 + depth;
      }
      g.setAttribute("position", new THREE.BufferAttribute(a, 3));
      const p = new THREE.Points(
        g,
        new THREE.PointsMaterial({
          color: 0x9fb4e0,
          size,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      scene.add(p);
      return { p, g, count };
    }
    const dustFar = dust(360, 0.035, 0.5, 30, -4),
      dustNear = dust(120, 0.08, 0.4, 20, 2);

    const mouse = { x: 0, y: 0 },
      target = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.y = (e.clientY / innerHeight) * 2 - 1;
    };
    const onResize = () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    };
    addEventListener("pointermove", onPointerMove);
    addEventListener("resize", onResize);

    // Timer over the deprecated Clock. connect(document) makes it hold time
    // still while the tab is hidden, so a backgrounded tab does not resume
    // with the core spun minutes ahead of where it left off.
    const timer = new THREE.Timer();
    timer.connect(document);

    let intro = 0,
      first = true,
      raf = 0;

    const onContextLost = (event: Event) => {
      // Default behaviour makes the loss permanent; either way there is
      // nothing left to draw, so hand over to the static fallback.
      event.preventDefault();
      cancelAnimationFrame(raf);
      fail("WebGL context lost");
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    function drift(d: { g: THREE.BufferGeometry; count: number }) {
      const a = d.g.attributes.position.array as Float32Array;
      for (let i = 0; i < d.count; i++) {
        a[i * 3 + 1] += 0.006;
        if (a[i * 3 + 1] > 10) a[i * 3 + 1] = -10;
      }
      d.g.attributes.position.needsUpdate = true;
    }
    function frame(timestamp?: number) {
      timer.update(timestamp);
      const t = timer.getElapsed();
      intro = Math.min(1, intro + 0.012);
      const e = 1 - Math.pow(1 - intro, 3);
      core.scale.setScalar(e * (1 + Math.sin(t * 1.6) * 0.03));
      camera.position.z = 14 - e * 4;
      core.rotation.y = t * 0.32;
      core.rotation.x = Math.sin(t * 0.5) * 0.12;
      gem.rotation.y = -t * 0.8;
      gem.rotation.x = t * 0.5;
      halo.material.opacity = 0.4 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.18;
      ring1.rotation.z = t * 0.18;
      ring2.rotation.z = -t * 0.13;
      net.rotation.y = -t * 0.13;
      net.rotation.x = Math.sin(t * 0.3) * 0.15;
      pills.forEach((p) => {
        const u = p.userData as PillData;
        u.ang += 0.0015 * u.sp * 10;
        p.position.x = Math.cos(u.ang) * u.rad;
        p.position.z = Math.sin(u.ang) * u.rad - 2;
        p.position.y = u.y + Math.sin(t * u.sp * 6 + u.bob) * 0.35;
        p.rotateOnAxis(u.ax, 0.01 * u.spin);
      });
      drift(dustFar);
      drift(dustNear);
      dustFar.p.rotation.y = t * 0.02;
      target.x += (mouse.x + Math.sin(t * 0.1) * 0.15 - target.x) * 0.035;
      target.y += (mouse.y - target.y) * 0.035;
      camera.position.x = target.x * 1.5;
      camera.position.y = -target.y * 1.0;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      if (first) {
        first = false;
        setStatus("ready");
      }
      raf = requestAnimationFrame(frame);
    }

    // Both paths hand off to rAF rather than painting inline: the status flip
    // has to happen outside the effect body to avoid a cascading render, and
    // scheduling it also means a tab that loads in the background keeps the
    // fallback up until it is actually looked at, instead of revealing a
    // canvas frozen on frame one of the intro.
    try {
      if (reduce) {
        intro = 1;
        core.scale.setScalar(1);
        camera.position.z = 10;
        core.rotation.y = 0.5;
        net.rotation.y = -0.3;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(() => setStatus("ready"));
      } else {
        raf = requestAnimationFrame(frame);
      }
    } catch (error) {
      fail("first frame failed", error);
    }

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onPointerMove);
      removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      timer.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material as
          THREE.Material | THREE.Material[] | undefined;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
      });
      GLOW.dispose();
      envSource?.dispose();
      envMap?.dispose();
      pmrem?.dispose();
      renderer.dispose();
      // dispose() frees three's GPU allocations but leaves the WebGL context
      // itself alive. Browsers cap those (~16 per process) and reclaim orphans
      // only on GC, so without this a long session of HMR reloads eventually
      // starves the next renderer and the hero stops appearing until a hard
      // reload. Safe here only because the canvas is per-mount.
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return (
    <>
      <HeroSceneFallback
        className={cn(
          "transition-opacity duration-[1400ms] ease-out",
          status === "ready" ? "opacity-0" : "opacity-100",
        )}
      />
      <div
        ref={hostRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-0 z-0 transition-opacity duration-[1400ms] ease-out",
          status === "ready" ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}
