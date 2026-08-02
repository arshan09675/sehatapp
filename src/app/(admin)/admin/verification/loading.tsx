import { Skeleton } from "@/components/ui/skeleton";

export default function VerificationLoading() {
  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </section>
  );
}
