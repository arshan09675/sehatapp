"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { specialties } from "./data";

// TODO(Phase 4): chips should filter the doctor list / link into /doctors.
export function SpecialtyChips() {
  const [active, setActive] = useState(0);

  return (
    <div className="mt-[30px] flex flex-wrap gap-2.5">
      {specialties.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => setActive(i)}
          className={cn(
            "border-line bg-surface text-ink hover:border-brand hover:text-brand-strong inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-[18px] py-2.5 text-sm font-medium transition-colors duration-150",
            active === i && "border-brand bg-brand-soft text-brand-strong",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
