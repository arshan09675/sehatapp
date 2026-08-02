import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { DoctorAvatar } from "@/components/admin/doctor-avatar";
import { VerifyButton } from "@/components/admin/verify-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/dal";
import { PMC_REGISTER_URL } from "@/lib/pmc";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verification queue — Admin — SehatBook",
};

const dateFmt = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeZone: "Asia/Karachi",
});

export default async function VerificationPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: doctors, error } = await supabase
    .from("doctors")
    .select(
      "id, pmc_number, specialty, qualifications, photo_url, created_at, profile:profiles!profile_id(full_name)",
    )
    .eq("is_verified", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Failed to load the verification queue");

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Verification queue
        </h1>
        <p className="text-muted-foreground text-sm">
          Check each doctor&rsquo;s PMC number on the{" "}
          <a
            href={PMC_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            PMDC public register
          </a>{" "}
          before marking them verified. Unverified doctors are invisible to
          patients.
        </p>
      </div>

      {doctors.length === 0 ? (
        <div className="border-border grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="font-medium">Queue is clear 🎉</p>
          <p className="text-muted-foreground text-sm">
            Every onboarded doctor has been verified.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {doctors.map((doctor) => {
            const name = doctor.profile?.full_name ?? "Unknown";
            return (
              <Card key={doctor.id} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2.5">
                    <DoctorAvatar
                      photoUrl={doctor.photo_url}
                      name={name}
                      size={32}
                    />
                    <Link
                      href={`/admin/doctors/${doctor.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {doctor.specialty}
                    {doctor.qualifications
                      ? ` · ${doctor.qualifications}`
                      : ""}{" "}
                    · onboarded {dateFmt.format(new Date(doctor.created_at))}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">PMC number: </span>
                    <span className="font-mono">{doctor.pmc_number}</span>
                    <a
                      href={PMC_REGISTER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary ml-3 inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      Check register
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </div>
                  <VerifyButton doctorId={doctor.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
