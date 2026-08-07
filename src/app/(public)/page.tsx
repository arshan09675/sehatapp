import Link from "next/link";
import { Suspense } from "react";

import { DocTop, DoctorCard } from "@/components/landing/doctor-card";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import HeroSceneLoader from "@/components/landing/hero-scene-loader";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CardIcon } from "@/components/landing/icons";
import { Reveal } from "@/components/landing/reveal";
import { SearchCard } from "@/components/landing/search-card";
import { SheetSkeleton } from "@/components/landing/sheet-skeleton";
import { SpecialtyChips } from "@/components/landing/specialty-chips";
import SplashLoader from "@/components/landing/splash/splash-loader";
import { StatBand } from "@/components/landing/stat-band";
import { btn, container } from "@/components/landing/styles";
import { Topbar } from "@/components/landing/topbar";
import { SlotPicker } from "@/components/public/slot-picker";
import { karachiDateKey } from "@/lib/datetime";
import { clinicLine, doctorMetaLine, formatFee } from "@/lib/doctor-display";
import {
  getAvailability,
  PICKER_DAYS,
  searchDoctors,
  toPickerDays,
} from "@/lib/public-doctors";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * The landing shell renders synchronously — no awaits above the <Suspense>
 * boundary below.
 *
 * That is deliberate and load-bearing: the splash and the 3D hero are client
 * chunks that cannot start downloading until the markup referencing them
 * reaches the browser. When this component awaited Supabase first, the hero
 * only mounted once four sequential query waves had finished — 1–16s in
 * practice — and never at all when one of them threw. Keeping the shell free
 * of data access puts the hero in the very first streamed chunk instead, so it
 * starts on its own schedule regardless of how the queries go.
 */
export default function LandingPage() {
  return (
    <div className="text-ink-light relative flex-1 overflow-x-clip bg-[radial-gradient(1200px_800px_at_75%_0%,rgba(59,130,246,.16)_0%,transparent_55%),radial-gradient(900px_600px_at_10%_92%,rgba(99,102,241,.18)_0%,transparent_60%),linear-gradient(160deg,#080B16_0%,#0B1022_45%,#070A14_100%)] bg-fixed">
      <SplashLoader />
      <HeroSceneLoader />
      <Topbar />
      <Hero />

      {/* ===== light content sheet ===== */}
      <div className="bg-surface-dim text-ink relative z-[2] -mt-[34px] rounded-t-[34px] pt-4 shadow-[0_-30px_60px_rgba(0,0,0,.35)]">
        <Suspense fallback={<SheetSkeleton />}>
          <LandingSheet />
        </Suspense>

        {/* how it works — static, so it stays in the shell */}
        <section id="how" className="scroll-mt-[74px] py-[52px]">
          <div className={container}>
            <Reveal className="mb-6 flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-ink text-[clamp(24px,3.2vw,34px)] font-semibold tracking-[-0.01em]">
                How it works
              </h2>
            </Reveal>
            <HowItWorks />
            <Reveal className="mt-[22px]">
              <StatBand />
            </Reveal>
          </div>
        </section>

        {/* faq — last thing on the light sheet, directly above the footer */}
        <Faq />
      </div>

      <Footer />
    </div>
  );
}

/**
 * Everything on the landing that needs Supabase: the search card's city list,
 * the doctor grid, and the live booking preview.
 *
 * Failures are caught rather than thrown. `searchDoctors` throws on a query
 * error, and the nearest route boundary — src/app/(public)/error.tsx — sits
 * above the page, so an uncaught throw here would replace the entire landing,
 * hero included, over a doctor list that could not load.
 */
async function LandingSheet() {
  const now = new Date();

  let cities: string[];
  let cards: Awaited<ReturnType<typeof searchDoctors>>;
  let featured: Awaited<ReturnType<typeof searchDoctors>>[number] | null;

  try {
    const supabase = await createClient();
    const [results, areas] = await Promise.all([
      searchDoctors({}, now),
      supabase.from("areas").select("city").order("city"),
    ]);

    cities = [...new Set((areas.data ?? []).map((area) => area.city))];
    cards = results.slice(0, 4);

    // The live picker showcases whoever can be seen soonest — the most
    // persuasive thing on the page, and now true rather than hardcoded.
    featured =
      results
        .filter((doctor) => doctor.next !== null)
        .sort(
          (a, b) => a.next!.startsAt.getTime() - b.next!.startsAt.getTime(),
        )[0] ?? null;
  } catch (error) {
    console.error("[landing] doctor data unavailable", error);
    return <SheetUnavailable />;
  }

  const featuredClinic = featured
    ? (featured.clinics.find(
        (entry) => entry.clinic.id === featured!.next!.clinicId,
      ) ?? featured.clinics[0])
    : null;

  // A failure here costs the booking preview only — the doctor grid above it
  // is already good, so it renders without the preview rather than not at all.
  let featuredDays: Awaited<ReturnType<typeof toPickerDays>> = [];
  if (featured && featuredClinic) {
    try {
      featuredDays = toPickerDays(
        await getAvailability(
          featured.id,
          featuredClinic.clinic.id,
          PICKER_DAYS,
          now,
        ),
        karachiDateKey(now),
      );
    } catch (error) {
      console.error("[landing] featured availability unavailable", error);
      featured = null;
    }
  }

  return (
    <>
      {/* search + specialties */}
      <section className="pb-[52px]">
        <div className={container}>
          <Reveal>
            <SearchCard cities={cities.length > 0 ? cities : ["Lahore"]} />
          </Reveal>
          <Reveal>
            <SpecialtyChips />
          </Reveal>
        </div>
      </section>

      {/* doctors */}
      <section id="doctors" className="scroll-mt-[74px] pt-2 pb-[52px]">
        <div className={container}>
          <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-heading text-ink text-[clamp(24px,3.2vw,34px)] font-semibold tracking-[-0.01em]">
              Doctors in Lahore
            </h2>
            <Link
              href="/doctors"
              className="text-brand-strong text-sm font-semibold underline underline-offset-2"
            >
              See all doctors →
            </Link>
          </Reveal>

          {cards.length === 0 ? (
            <div className="border-line grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
              <p className="text-ink font-medium">No doctors are listed yet</p>
              <p className="text-ink-muted max-w-md text-sm">
                Doctors appear here once an administrator has verified their PMC
                registration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
              {cards.map((doctor, index) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  delay={(index % 4) * 70}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* live booking preview */}
      {featured && featuredClinic && (
        <section id="booking" className="py-[52px]">
          <div className={container}>
            <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-heading text-ink text-[clamp(24px,3.2vw,34px)] font-semibold tracking-[-0.01em]">
                Book in under a minute
              </h2>
              <span className="text-ink-muted text-sm">
                Real availability — pick a time
              </span>
            </Reveal>

            <div className="grid grid-cols-[1fr_1.25fr] items-start gap-[18px] max-[860px]:grid-cols-1">
              <Reveal>
                <div className="bg-surface shadow-card rounded-2xl p-6">
                  <DocTop
                    photoUrl={featured.photoUrl}
                    name={featured.fullName}
                    meta={doctorMetaLine(
                      featured.specialty,
                      featured.qualifications,
                    )}
                    clinic={clinicLine(featuredClinic.clinic)}
                  />
                  <div className="bg-surface-dim mt-4 flex items-center justify-between rounded-[11px] px-4 py-3 text-[14.5px]">
                    <span>Consultation fee</span>
                    <strong className="tabular-nums">
                      {formatFee(featuredClinic.feePkr)}
                    </strong>
                  </div>
                  <p className="text-ink-muted mt-2.5 flex items-center gap-[7px] text-[13px]">
                    <CardIcon className="text-brand size-[15px] flex-none" />
                    Pay at the clinic — no online payment required
                  </p>
                  <Link
                    href={`/doctors/${featured.id}?clinic=${featuredClinic.clinic.id}`}
                    className={cn(
                      btn,
                      "bg-brand-soft text-brand-strong mt-4 min-h-11 w-full",
                    )}
                  >
                    View full profile
                  </Link>
                </div>
              </Reveal>

              <Reveal>
                <div className="bg-surface shadow-card rounded-2xl p-6">
                  {/* mode="link" — the landing hands off to the doctor's
                      page with the slot preselected rather than booking
                      from a marketing surface. */}
                  <SlotPicker
                    doctorId={featured.id}
                    clinicId={featuredClinic.clinic.id}
                    days={featuredDays}
                    mode="link"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** Shown in place of the doctor sections when their queries fail outright. */
function SheetUnavailable() {
  return (
    <section className="pt-2 pb-[52px]">
      <div className={container}>
        <div className="border-line grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="text-ink font-medium">
            Doctor listings are unavailable right now
          </p>
          <p className="text-ink-muted max-w-md text-sm">
            This is temporary — nothing is wrong with your booking. Try again in
            a moment, or browse the full list of doctors.
          </p>
          <Link
            href="/doctors"
            className={cn(
              btn,
              "bg-brand-soft text-brand-strong mt-2 min-h-11 px-5",
            )}
          >
            Find a doctor
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Real availability changes minute to minute; never serve a cached landing. */
export const dynamic = "force-dynamic";
