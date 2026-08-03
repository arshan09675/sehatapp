import Link from "next/link";

import { cn } from "@/lib/utils";
import type { LandingDoctor } from "./data";
import { MapPinIcon, ShieldCheckIcon } from "./icons";
import { Reveal } from "./reveal";
import { btn, btnGlass, btnPrimary, btnSm } from "./styles";

/** Avatar + name + PMC badge + meta + clinic — shared with the slot-picker demo panel. */
export function DocTop({
  initials,
  name,
  meta,
  clinic,
}: {
  initials: string;
  name: string;
  meta: string;
  clinic: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="bg-brand-soft font-heading text-brand-strong flex size-14 flex-none items-center justify-center rounded-full text-xl font-bold">
        {initials}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-ink text-[19px] font-semibold tracking-[-0.01em]">
            {name}
          </span>
          <span className="bg-brand-soft text-brand inline-flex items-center gap-[5px] rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold">
            <ShieldCheckIcon className="size-[13px] flex-none" /> PMC Verified
          </span>
        </div>
        <p className="text-ink-muted mt-0.5 text-sm">{meta}</p>
        <p className="text-ink-muted mt-[3px] flex items-center gap-1.5 text-sm">
          <MapPinIcon className="size-3.5 flex-none" /> {clinic}
        </p>
      </div>
    </div>
  );
}

export function DoctorCard({
  doctor,
  delay = 0,
}: {
  doctor: LandingDoctor;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <article className="bg-surface shadow-card hover:shadow-lift flex h-full flex-col gap-3.5 rounded-2xl p-5 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-[3px] motion-reduce:hover:translate-y-0">
        <DocTop
          initials={doctor.initials}
          name={doctor.name}
          meta={doctor.meta}
          clinic={doctor.clinic}
        />
        <div className="border-line mt-auto flex items-center justify-between gap-2.5 border-t pt-3.5">
          <div className="flex items-center gap-3.5">
            <span className="text-ink font-semibold tabular-nums">
              {doctor.fee}{" "}
              <small className="text-ink-muted block text-xs font-normal">
                consultation
              </small>
            </span>
            {doctor.availableToday && (
              <span className="bg-amber-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold text-[#92500A]">
                ● Available today
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {doctor.nextSlot && (
              /* TODO(Phase 4): deep-link into the booking flow at this slot */
              <Link
                href="/login"
                className={cn(
                  btn,
                  btnGlass,
                  btnSm,
                  "bg-brand-soft text-brand-strong border-none",
                )}
              >
                {doctor.nextSlot}
              </Link>
            )}
            {/* TODO(Phase 4): route to the doctor profile / booking page */}
            <Link href="/login" className={cn(btn, btnPrimary, btnSm)}>
              Book
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
