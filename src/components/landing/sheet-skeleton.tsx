import { Skeleton } from "@/components/ui/skeleton";
import { container } from "./styles";

/**
 * Stands in for the data-driven part of the landing sheet — search card,
 * specialty chips, and the doctor grid — while the Supabase queries behind it
 * resolve.
 *
 * Shared by the page's own <Suspense> boundary and src/app/(public)/loading.tsx
 * so the two cannot drift apart. Heights mirror the real sections in
 * src/app/(public)/page.tsx; change one and this needs the same edit.
 */
export function SheetSkeleton() {
  return (
    <>
      <section className="pb-[52px]">
        <div className={container}>
          <Skeleton className="-mt-[52px] h-[86px] w-full max-w-[820px] rounded-2xl md:mx-auto" />
          <div className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="pt-2 pb-[52px]">
        <div className={container}>
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[186px] w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
