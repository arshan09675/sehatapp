import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";

import { DoctorAvatar } from "@/components/admin/doctor-avatar";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { VerifyButton } from "@/components/admin/verify-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/dal";
import { PMC_REGISTER_URL } from "@/lib/pmc";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Doctor — Admin" };

const dateFmt = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeZone: "Asia/Karachi",
});

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select(
      `id, pmc_number, specialty, qualifications, bio, photo_url,
       experience_years, is_verified, verified_at, created_at,
       profile:profiles!profile_id(full_name, email, phone),
       verifier:profiles!verified_by(full_name),
       doctor_clinics(id, fee_pkr, clinic:clinics(name, area, city))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!doctor) notFound();
  const name = doctor.profile?.full_name ?? "Unknown";

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <DoctorAvatar photoUrl={doctor.photo_url} name={name} size={64} />
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              {name}
              {doctor.is_verified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="secondary">Unverified</Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {doctor.specialty}
              {doctor.qualifications ? ` · ${doctor.qualifications}` : ""}
              {doctor.experience_years != null
                ? ` · ${doctor.experience_years} yrs experience`
                : ""}
            </p>
          </div>
        </div>
        <ResetPasswordButton doctorId={doctor.id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
            <CardDescription>
              PMC number:{" "}
              <span className="text-foreground font-mono">
                {doctor.pmc_number}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid justify-items-start gap-3 text-sm">
            <a
              href={PMC_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              Check on the PMDC public register
              <ExternalLinkIcon className="size-3.5" />
            </a>
            {doctor.is_verified ? (
              <p className="text-muted-foreground">
                Verified{" "}
                {doctor.verified_at
                  ? `on ${dateFmt.format(new Date(doctor.verified_at))}`
                  : ""}
                {doctor.verifier?.full_name
                  ? ` by ${doctor.verifier.full_name}`
                  : ""}
                .
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Search the register for the PMC number above, confirm the name
                  and specialty match, then mark as verified.
                </p>
                <VerifyButton doctorId={doctor.id} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Email</dt>
                <dd>{doctor.profile?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Phone</dt>
                <dd>{doctor.profile?.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Onboarded</dt>
                <dd>{dateFmt.format(new Date(doctor.created_at))}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clinics</CardTitle>
          <CardDescription>
            Where this doctor takes appointments, with the fee per visit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {doctor.doctor_clinics.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No clinic assignments.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead className="text-right">Fee (PKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctor.doctor_clinics.map((dc) => (
                  <TableRow key={dc.id}>
                    <TableCell className="font-medium">
                      {dc.clinic?.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dc.clinic?.area}, {dc.clinic?.city}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {dc.fee_pkr.toLocaleString("en-PK")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {doctor.bio && (
        <Card>
          <CardHeader>
            <CardTitle>Bio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{doctor.bio}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-sm">
        <Link
          href="/admin/doctors"
          className="underline-offset-4 hover:underline"
        >
          ← Back to doctors
        </Link>
      </p>
    </section>
  );
}
