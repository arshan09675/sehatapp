import { container } from "@/components/landing/styles";
import { PublicShell } from "@/components/public/public-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function DoctorProfileLoading() {
  return (
    <PublicShell>
      <div className={container}>
        <Skeleton className="mb-5 h-5 w-28" />

        <div className="grid grid-cols-[1fr_1.25fr] items-start gap-[18px] max-[860px]:grid-cols-1">
          <div className="bg-surface shadow-card grid gap-4 rounded-2xl p-6">
            <div className="flex items-start gap-3.5">
              <Skeleton className="size-14 flex-none rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-[11px]" />
            <Skeleton className="h-4 w-64" />
          </div>

          <div className="bg-surface shadow-card grid gap-4 rounded-2xl p-6">
            <Skeleton className="h-5 w-28" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[46px] w-[92px] rounded-[11px]"
                />
              ))}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-[9px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-[46px] w-full rounded-full" />
              ))}
            </div>
            <Skeleton className="h-[52px] w-full rounded-[14px]" />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
