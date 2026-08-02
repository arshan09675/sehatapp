import { Skeleton } from "@/components/ui/skeleton";

export default function ClinicsLoading() {
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </section>
  );
}
