import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <section className="grid grid-cols-[1.5fr_1fr] items-start gap-[18px] max-[860px]:grid-cols-1">
      <div className="bg-surface shadow-card rounded-2xl p-5">
        <Skeleton className="mb-2 h-5 w-36" />
        <Skeleton className="mb-4 h-4 w-full max-w-sm" />
        <Skeleton className="mb-4 h-11 w-full rounded-[11px]" />
        <div className="grid gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
        <Skeleton className="mt-5 h-11 w-32 rounded-xl" />
      </div>

      <div className="bg-surface shadow-card rounded-2xl p-5">
        <Skeleton className="mb-2 h-5 w-40" />
        <Skeleton className="mb-4 h-4 w-full max-w-xs" />
        <div className="grid gap-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-[11px]" />
          ))}
        </div>
        <Skeleton className="mt-3 h-11 w-full rounded-xl" />
      </div>
    </section>
  );
}
