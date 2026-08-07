import { Footer } from "@/components/landing/footer";
import { SheetSkeleton } from "@/components/landing/sheet-skeleton";
import { container } from "@/components/landing/styles";
import { Topbar } from "@/components/landing/topbar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Navigation fallback for the landing. /doctors and /doctors/[id] have their
 * own closer boundaries, so this only stands in for `/`.
 *
 * It is no longer on the initial-load path: the page shell renders
 * synchronously and streams immediately, with its own <Suspense> around the
 * Supabase-backed sections. This covers the gap during a client-side
 * navigation to `/`, before that shell arrives.
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
        <SheetSkeleton />
      </div>

      <Footer />
    </div>
  );
}
