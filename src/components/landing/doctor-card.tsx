import Link from "next/link";

import { DoctorAvatar } from "@/components/admin/doctor-avatar";
import { clinicLine, doctorMetaLine, formatFee } from "@/lib/doctor-display";
import type { DoctorSearchResult } from "@/lib/public-doctors";
import { cn } from "@/lib/utils";
import { MapPinIcon, ShieldCheckIcon } from "./icons";
import { Reveal } from "./reveal";
import { btn, btnGlass, btnPrimary, btnSm } from "./styles";

/**
 * Avatar + name + PMC badge + meta + clinic. Shared by the search cards and
 * the doctor profile panel.
 *
 * The reference draws initials in the avatar slot because it is a static
 * mockup; DESIGN.md:83 asks for the real photo, so DoctorAvatar renders
 * `photo_url` and falls back to initials in the same brand-soft circle.
 */
export function DocTop({
  photoUrl,
  name,
  meta,
  clinic,
}: {
  photoUrl: string | null;
  name: string;
  meta: string;
  clinic: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <DoctorAvatar
        photoUrl={photoUrl}
        name={name}
        size={56}
        className="bg-brand-soft text-brand-strong font-heading flex-none text-xl font-bold"
      />
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
  doctor: DoctorSearchResult;
  delay?: number;
}) {
  // Search filters narrow the embed to the matching clinic, so the first entry
  // is the one the patient searched for.
  const association = doctor.clinics[0];
  const nextIsToday = doctor.availableToday;
  const profileHref = association
    ? `/doctors/${doctor.id}?clinic=${association.clinic.id}`
    : `/doctors/${doctor.id}`;

  return (
    <Reveal delay={delay} className="h-full">
      <article className="bg-surface shadow-card hover:shadow-lift relative flex h-full flex-col gap-3.5 rounded-2xl p-5 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-[3px] motion-reduce:hover:translate-y-0">
        <DocTop
          photoUrl={doctor.photoUrl}
          name={doctor.fullName}
          meta={doctorMetaLine(
            doctor.specialty,
            doctor.qualifications,
            doctor.experienceYears,
          )}
          clinic={
            association
              ? clinicLine(association.clinic)
              : "Clinic to be confirmed"
          }
        />

        <div className="border-line mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t pt-3.5">
          <div className="flex items-center gap-3.5">
            {association && (
              <span className="text-ink font-semibold tabular-nums">
                {formatFee(association.feePkr)}{" "}
                <small className="text-ink-muted block text-xs font-normal">
                  consultation
                </small>
              </span>
            )}
            {nextIsToday && (
              <span className="bg-amber-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold text-[#92500A]">
                ● Available today
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {doctor.next && !nextIsToday && (
              <Link
                href={`/doctors/${doctor.id}?clinic=${doctor.next.clinicId}&slot=${encodeURIComponent(doctor.next.startsAt.toISOString())}`}
                className={cn(
                  btn,
                  btnGlass,
                  btnSm,
                  "bg-brand-soft text-brand-strong relative z-[1] border-none",
                )}
              >
                {doctor.next.label}
              </Link>
            )}
            {/* Stretched link: covers the whole card so anywhere is clickable,
                while the next-slot pill above stays its own target. */}
            <Link
              href={profileHref}
              className={cn(
                btn,
                btnPrimary,
                btnSm,
                "after:absolute after:inset-0 after:rounded-2xl after:content-['']",
              )}
            >
              {doctor.next ? "Book" : "View profile"}
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
