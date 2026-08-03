import Link from "next/link";

import { cn } from "@/lib/utils";

export type Tab = {
  key: string;
  label: string;
  href: string;
  /** Omitted for tabs whose size is unbounded (Past), per the reference. */
  count?: number;
};

export function TabPills({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-line bg-surface text-ink inline-flex min-h-[38px] items-center rounded-full border px-4 py-[7px] text-[13.5px] font-medium transition-colors duration-150",
              isActive &&
                "border-brand bg-brand-soft text-brand-strong font-semibold",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "bg-surface-dim ml-1.5 rounded-full px-2 py-px text-[11.5px] tabular-nums",
                  isActive && "bg-white",
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
