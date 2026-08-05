import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocTop } from "@/components/landing/doctor-card";
import { CardIcon } from "@/components/landing/icons";
import { container } from "@/components/landing/styles";
import { PublicShell } from "@/components/public/public-shell";
import { SlotPicker } from "@/components/public/slot-picker";
import { karachiDateKey } from "@/lib/datetime";
import { clinicLine, doctorMetaLine, formatFee } from "@/lib/doctor-display";
import {
  getAvailability,
  getPublicDoctor,
  PICKER_DAYS,
  toPickerDays,
} from "@/lib/public-doctors";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clinic?: string; slot?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const doctor = await getPublicDoctor(id);
  if (!doctor) return { title: "Doctor not found" };

  return {
    title: `${doctor.fullName} — ${doctor.specialty}`,
    description:
      doctor.bio ??
      `Book an appointment with ${doctor.fullName}, PMC-verified ${doctor.specialty}.`,
  };
}

export default async function DoctorProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { clinic, slot } = await searchParams;

  const doctor = await getPublicDoctor(id);
  // Unverified and unknown doctors are indistinguishable from here on
  // purpose — an unverified doctor is not public information.
  if (!doctor) notFound();

  const association =
    doctor.clinics.find((entry) => entry.clinic.id === clinic) ??
    doctor.clinics[0];

  const now = new Date();
  const days = association
    ? await getAvailability(doctor.id, association.clinic.id, PICKER_DAYS, now)
    : [];
  const pickerDays = toPickerDays(days, karachiDateKey(now));

  return (
    <PublicShell>
      <div className={container}>
        <Link
          href="/doctors"
          className="text-ink-muted hover:text-brand-strong mb-5 inline-block text-sm font-medium"
        >
          ← All doctors
        </Link>

        <div className="grid grid-cols-[1fr_1.25fr] items-start gap-[18px] max-[860px]:grid-cols-1">
          <div className="bg-surface shadow-card rounded-2xl p-6">
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
                  : "No clinic listed yet"
              }
            />

            {doctor.bio && (
              <p className="text-ink-muted mt-4 text-sm leading-relaxed">
                {doctor.bio}
              </p>
            )}

            {association && (
              <>
                <div className="bg-surface-dim mt-4 flex items-center justify-between rounded-[11px] px-4 py-3 text-[14.5px]">
                  <span>Consultation fee</span>
                  <strong className="tabular-nums">
                    {formatFee(association.feePkr)}
                  </strong>
                </div>
                <p className="text-ink-muted mt-2.5 flex items-center gap-[7px] text-[13px]">
                  <CardIcon className="text-brand size-[15px] flex-none" />
                  Pay at the clinic — no online payment required
                </p>
                <p className="text-ink-muted mt-3 text-[13px]">
                  {association.clinic.address}
                </p>
              </>
            )}

            {doctor.clinics.length > 1 && (
              <div className="border-line mt-4 border-t pt-4">
                <p className="text-ink mb-2 text-[13px] font-semibold">
                  Also practises at
                </p>
                <div className="flex flex-wrap gap-2">
                  {doctor.clinics
                    .filter(
                      (entry) => entry.clinic.id !== association?.clinic.id,
                    )
                    .map((entry) => (
                      <Link
                        key={entry.clinic.id}
                        href={`/doctors/${doctor.id}?clinic=${entry.clinic.id}`}
                        className="bg-brand-soft text-brand-strong inline-flex min-h-9 items-center rounded-full px-3 text-[13px] font-semibold"
                      >
                        {entry.clinic.name} · {formatFee(entry.feePkr)}
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface shadow-card rounded-2xl p-6">
            <h2 className="font-heading text-ink mb-1 text-[17px] font-semibold">
              Pick a time
            </h2>
            <p className="text-ink-muted mb-4 text-[13px]">
              Booking is free. You pay the consultation fee at the clinic.
            </p>

            {association ? (
              <SlotPicker
                doctorId={doctor.id}
                clinicId={association.clinic.id}
                days={pickerDays}
                initialSlotIso={slot}
              />
            ) : (
              <div className="border-line grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
                <p className="text-ink font-medium">Not taking bookings yet</p>
                <p className="text-ink-muted text-sm">
                  This doctor has not been assigned to a clinic. Try another
                  doctor while they get set up.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
