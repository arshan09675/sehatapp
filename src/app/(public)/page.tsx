import { doctors } from "@/components/landing/data";
import { DoctorCard } from "@/components/landing/doctor-card";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import HeroSceneLoader from "@/components/landing/hero-scene-loader";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Reveal } from "@/components/landing/reveal";
import { SearchCard } from "@/components/landing/search-card";
import { SlotPickerDemo } from "@/components/landing/slot-picker-demo";
import { SpecialtyChips } from "@/components/landing/specialty-chips";
import { StatBand } from "@/components/landing/stat-band";
import { container } from "@/components/landing/styles";
import { Topbar } from "@/components/landing/topbar";

export default function LandingPage() {
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
              <SearchCard />
            </Reveal>
            <Reveal>
              <SpecialtyChips />
            </Reveal>
          </div>
        </section>

        {/* doctors */}
        <section id="doctors" className="scroll-mt-[74px] pt-2 pb-[52px]">
          <div className={container}>
            <Reveal className="mb-6 flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-ink text-[clamp(24px,3.2vw,34px)] font-semibold tracking-[-0.01em]">
                Doctors in Lahore
              </h2>
              <span className="text-ink-muted text-sm">
                Sorted by earliest availability
              </span>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
              {/* TODO(Phase 4): fetch verified doctors from Supabase (see data.ts) */}
              {doctors.map((doctor, i) => (
                <DoctorCard
                  key={doctor.name}
                  doctor={doctor}
                  delay={(i % 4) * 70}
                />
              ))}
            </div>
          </div>
        </section>

        {/* booking / slot picker */}
        <section id="booking" className="py-[52px]">
          <div className={container}>
            <Reveal className="mb-6 flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-ink text-[clamp(24px,3.2vw,34px)] font-semibold tracking-[-0.01em]">
                Book in under a minute
              </h2>
              <span className="text-ink-muted text-sm">
                Live slot picker — try it
              </span>
            </Reveal>
            <SlotPickerDemo />
          </div>
        </section>

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
