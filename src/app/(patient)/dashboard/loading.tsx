import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <section>
      <Skeleton className="mb-2 h-8 w-72" />
      <Skeleton className="mb-6 h-4 w-96 max-w-full" />

      <div className="mb-4 flex gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[38px] w-32 rounded-full" />
        ))}
      </div>

      <div className="grid gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
        ))}
      </div>
    </section>
  );
}
