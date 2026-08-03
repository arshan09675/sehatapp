"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Trust stat band with the count-up "100%" stat (reference behavior: counts up
 * in ~40 rAF steps once half the band scrolls into view).
 */
export function StatBand() {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const to = 100;
          let n = 0;
          const step = () => {
            n += Math.ceil(to / 40);
            if (n >= to) {
              setCount(to);
            } else {
              setCount(n);
              requestAnimationFrame(step);
            }
          };
          step();
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="border-line bg-surface shadow-card grid grid-cols-3 gap-[18px] rounded-2xl border p-7 max-[860px]:grid-cols-1"
    >
      <div className="text-center">
        <div className="font-heading text-brand-strong text-[34px] font-bold tracking-[-0.01em]">
          {count}%
        </div>
        <div className="text-ink-muted mt-1 text-[13.5px]">
          PMC-verified doctors
        </div>
      </div>
      <div className="text-center">
        <div className="font-heading text-brand-strong text-[34px] font-bold tracking-[-0.01em]">
          &lt; 60s
        </div>
        <div className="text-ink-muted mt-1 text-[13.5px]">
          Average booking time
        </div>
      </div>
      <div className="text-center">
        <div className="font-heading text-brand-strong text-[34px] font-bold tracking-[-0.01em]">
          Rs. 0
        </div>
        <div className="text-ink-muted mt-1 text-[13.5px]">
          Booking fee — always
        </div>
      </div>
    </div>
  );
}
