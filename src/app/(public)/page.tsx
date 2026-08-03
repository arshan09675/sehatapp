import Link from "next/link";

import { DocTop, DoctorCard } from "@/components/landing/doctor-card";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import HeroSceneLoader from "@/components/landing/hero-scene-loader";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CardIcon } from "@/components/landing/icons";
import { Reveal } from "@/components/landing/reveal";
import { SearchCard } from "@/components/landing/search-card";
import { SpecialtyChips } from "@/components/landing/specialty-chips";
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

export default async function LandingPage() {
  const now = new Date();
  const supabase = await createClient();

  const [results, areas] = await Promise.all([
    searchDoctors({}, now),
    supabase.from("areas").select("city").order("city"),
  ]);

  const cities = [...new Set((areas.data ?? []).map((area) => area.city))];
  const cards = results.slice(0, 4);

  // The live picker showcases whoever can be seen soonest — the most
  // persuasive thing on the page, and now true rather than hardcoded.
  const featured =
    results
      .filter((doctor) => doctor.next !== null)
      .sort(
        (a, b) => a.next!.startsAt.getTime() - b.next!.startsAt.getTime(),
      )[0] ?? null;

  const featuredClinic = featured
    ? (featured.clinics.find(
        (entry) => entry.clinic.id === featured.next!.clinicId,
      ) ?? featured.clinics[0])
    : null;

  const featuredDays =
    featured && featuredClinic
      ? toPickerDays(
          await getAvailability(
            featured.id,
            featuredClinic.clinic.id,
            PICKER_DAYS,
            now,
          ),
          karachiDateKey(now),
        )
      : [];

  return (
    <div className="text-ink-light relative flex-1 overflow-x-clip bg-[radial-gradient(1200px_800px_at_75%_0%,rgba(59,130,246,.16)_0%,transparent_55%),radial-gradient(900px_600px_at_10%_92%,rgba(99,102,241,.18)_0%,transparent_60%),linear-gradient(160deg,#080B16_0%,#0B1022_45%,#070A14_100%)] bg-fixed">
      <HeroSceneLoader />
      <Topbar />
      <Hero />

      {/* ===== light content sheet ===== */}
      <div className="bg-surface-dim text-ink relative z-[2] -mt-[34px] rounded-t-[34px] pt-4 shadow-[0_-30px_60px_rgba(0,0,0,.35)]">
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
                <p className="text-ink font-medium">
                  No doctors are listed yet
                </p>
                <p className="text-ink-muted max-w-md text-sm">
                  Doctors appear here once an administrator has verified their
                  PMC registration.
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

        {/* how it works */}
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
      </div>

      <Footer />
    </div>
  );
}

/** Real availability changes minute to minute; never serve a cached landing. */
export const dynamic = "force-dynamic";
