import { container } from "@/components/landing/styles";
import { PublicShell } from "@/components/public/public-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function DoctorsLoading() {
  return (
    <PublicShell>
      <div className={container}>
        <Skeleton className="h-[86px] w-full rounded-2xl" />

        <div className="mt-8 mb-6 flex items-baseline justify-between gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[186px] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
