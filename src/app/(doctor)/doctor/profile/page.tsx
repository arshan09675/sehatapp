import type { Metadata } from "next";

import {
  ClinicAssociations,
  type ClinicAssociation,
} from "@/components/doctor/clinic-associations";
import { ProfileForm } from "@/components/doctor/profile-form";
import {
  docCard,
  docPanelHint,
  docPanelTitle,
} from "@/components/doctor/styles";
import { ShieldCheckIcon } from "@/components/landing/icons";
import { requireDoctor } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profile — Doctor — SehatBook",
};

type ClinicRow = { name: string; area: string; city: string; address: string };

export default async function DoctorProfilePage() {
  const { profile, doctor } = await requireDoctor();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_clinics")
    .select("id, fee_pkr, clinic:clinics(name, area, city, address)")
    .eq("doctor_id", doctor.id);

  if (error) throw new Error("Failed to load your clinics");

  const associations: ClinicAssociation[] = (data ?? []).map((row) => ({
    id: row.id,
    feePkr: row.fee_pkr,
    clinic: (Array.isArray(row.clinic)
      ? row.clinic[0]
      : row.clinic) as ClinicRow,
  }));

  return (
    <section className="grid gap-[18px]">
      <div
        className={cn(
          docCard,
          "flex flex-wrap items-center justify-between gap-3 p-5",
        )}
      >
        <div>
          <h1 className="font-heading text-ink text-xl font-semibold">
            {profile.full_name}
          </h1>
          <p className="text-ink-muted text-[13.5px]">
            PMC {doctor.pmc_number}
          </p>
        </div>
        {doctor.is_verified ? (
          <span className="bg-brand-soft text-brand-strong inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold">
            <ShieldCheckIcon className="size-4" />
            PMC Verified
          </span>
        ) : (
          <span className="bg-amber-soft inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#92500A]">
            Awaiting PMC verification
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-[18px] max-[860px]:grid-cols-1">
        <div className={cn(docCard, "p-5")}>
          <h2 className={docPanelTitle}>Your profile</h2>
          <p className={docPanelHint}>
            This is what patients read before they book. Your name and PMC
            number are set by the admin who onboarded you.
          </p>
          <ProfileForm
            profile={{
              fullName: profile.full_name,
              specialty: doctor.specialty,
              qualifications: doctor.qualifications,
              bio: doctor.bio,
              experienceYears: doctor.experience_years,
              photoUrl: doctor.photo_url,
            }}
          />
        </div>

        <div className={cn(docCard, "p-5")}>
          <h2 className={docPanelTitle}>Your clinics</h2>
          <p className={docPanelHint}>
            Where you practise, and the consultation fee patients see.
          </p>
          <ClinicAssociations associations={associations} />
        </div>
      </div>
    </section>
  );
}
