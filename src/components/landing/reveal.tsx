"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll-reveal wrapper — port of the reference's `.reveal` /
 * IntersectionObserver behavior (threshold 0.14, reveal once, 70ms stagger
 * handled by the caller via `delay`). Respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // prefers-reduced-motion needs no JS branch: the motion-reduce: classes
  // below force the revealed state regardless of observer timing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "translate-y-[22px] opacity-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:translate-y-0 motion-reduce:opacity-100",
        inView && "translate-y-0 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
