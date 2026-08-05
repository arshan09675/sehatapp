import { Skeleton } from "@/components/ui/skeleton";

export default function NewDoctorLoading() {
  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid max-w-lg gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
        <Skeleton className="h-10 w-28" />
      </div>
    </section>
  );
}
