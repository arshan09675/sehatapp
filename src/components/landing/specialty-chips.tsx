import Link from "next/link";

import { cn } from "@/lib/utils";
import { specialties } from "./data";

const CHIP =
  "border-line bg-surface text-ink hover:border-brand hover:text-brand-strong inline-flex min-h-11 items-center gap-2 rounded-full border px-[18px] py-2.5 text-sm font-medium transition-colors duration-150";
const CHIP_ACTIVE = "border-brand bg-brand-soft text-brand-strong";

/**
 * Specialty shortcuts. Links rather than local state — a chip is a search, so
 * it belongs in the URL where it can be shared and navigated back to.
 */
export function SpecialtyChips({ active }: { active?: string }) {
  return (
    <div className="mt-[30px] flex flex-wrap gap-2.5">
      <Link href="/doctors" className={cn(CHIP, !active && CHIP_ACTIVE)}>
        All
      </Link>
      {specialties.map((specialty) => (
        <Link
          key={specialty}
          href={`/doctors?specialty=${encodeURIComponent(specialty)}`}
          className={cn(CHIP, active === specialty && CHIP_ACTIVE)}
        >
          {specialty}
        </Link>
      ))}
    </div>
  );
}
