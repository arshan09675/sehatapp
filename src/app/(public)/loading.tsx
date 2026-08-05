import { Footer } from "@/components/landing/footer";
import { container } from "@/components/landing/styles";
import { Topbar } from "@/components/landing/topbar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback for the landing, which is force-dynamic and waits on two Supabase
 * round-trips before it can render. /doctors and /doctors/[id] have their own
 * closer boundaries, so this only stands in for `/`.
 *
 * The backdrop and sheet classes mirror src/app/(public)/page.tsx, and the hero
 * footprint mirrors src/components/landing/hero.tsx — edit those and this drifts.
 * SplashLoader and HeroSceneLoader are deliberately absent: mounting client
 * chunks in a fallback that is about to unmount would initialise them twice,
 * and the splash would mark itself seen without ever being watched.
 */
export default function LandingLoading() {
  return (
    <div className="text-ink-light relative flex-1 overflow-x-clip bg-[radial-gradient(1200px_800px_at_75%_0%,rgba(59,130,246,.16)_0%,transparent_55%),radial-gradient(900px_600px_at_10%_92%,rgba(99,102,241,.18)_0%,transparent_60%),linear-gradient(160deg,#080B16_0%,#0B1022_45%,#070A14_100%)] bg-fixed">
      <Topbar />

      <section className="relative flex min-h-[calc(100vh-74px)] items-center pt-10 pb-[70px] max-[860px]:min-h-0 max-[860px]:pt-[30px] max-[860px]:pb-[90px]">
        <div className={container}>
          <div className="grid max-w-[700px] justify-items-start gap-[26px]">
            <Skeleton className="bg-glass h-[34px] w-[290px] max-w-full rounded-full" />
            <div className="grid w-full gap-3">
              <Skeleton className="bg-glass h-[clamp(40px,6.2vw,72px)] w-full" />
              <Skeleton className="bg-glass h-[clamp(40px,6.2vw,72px)] w-3/4" />
            </div>
            <Skeleton className="bg-glass h-16 w-full max-w-[560px]" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="bg-glass h-12 w-[170px] rounded-[14px]" />
              <Skeleton className="bg-glass h-12 w-[150px] rounded-[14px]" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== light content sheet ===== */}
      <div className="bg-surface-dim text-ink relative z-[2] -mt-[34px] rounded-t-[34px] pt-4 shadow-[0_-30px_60px_rgba(0,0,0,.35)]">
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
      </div>

      <Footer />
    </div>
  );
}
