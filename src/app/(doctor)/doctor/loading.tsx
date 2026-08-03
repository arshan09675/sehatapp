import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentsLoading() {
  return (
    <section>
      <Skeleton className="mb-2 h-7 w-64" />
      <Skeleton className="mb-[18px] h-4 w-80 max-w-full" />

      <div className="mb-5 grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] w-full rounded-xl" />
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[38px] w-28 rounded-full" />
        ))}
      </div>

      <div className="grid gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[78px] w-full rounded-xl" />
        ))}
      </div>
    </section>
  );
}
