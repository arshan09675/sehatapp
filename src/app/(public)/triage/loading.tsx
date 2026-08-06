import { container } from "@/components/landing/styles";
import { PublicShell } from "@/components/public/public-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function TriageLoading() {
  return (
    <PublicShell>
      <div className={container}>
        <div className="mx-auto max-w-[640px]">
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="mt-3 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-2/3" />

          <Skeleton className="mt-7 h-[320px] w-full rounded-2xl" />

          <div className="mt-8">
            <Skeleton className="h-4 w-40" />
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-28 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
