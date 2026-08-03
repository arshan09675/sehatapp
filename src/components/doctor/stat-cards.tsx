import { cn } from "@/lib/utils";

export type Stat = {
  value: number;
  label: string;
  /** Highlights the number in amber — used for work waiting on the doctor. */
  tone?: "warn";
};

export function StatCards({ items }: { items: Stat[] }) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
      {items.map((item) => (
        <div key={item.label} className="bg-surface-dim rounded-xl px-4 py-3.5">
          <div
            className={cn(
              "font-heading text-ink text-[26px] font-bold tabular-nums",
              item.tone === "warn" && "text-amber",
            )}
          >
            {item.value}
          </div>
          <div className="text-ink-muted mt-[3px] text-[12.5px]">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
