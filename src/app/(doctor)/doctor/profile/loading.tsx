import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <section className="grid gap-[18px]">
      <div className="bg-surface shadow-card flex items-center justify-between gap-3 rounded-2xl p-5">
        <div className="grid gap-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-[18px] max-[860px]:grid-cols-1">
        <div className="bg-surface shadow-card grid gap-4 rounded-2xl p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="size-16 rounded-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
        <div className="bg-surface shadow-card grid gap-2.5 rounded-2xl p-5">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[11px]" />
          ))}
        </div>
      </div>
    </section>
  );
}
