import type { Metadata } from "next";
import Link from "next/link";

import { DoctorAvatar } from "@/components/admin/doctor-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Doctors — Admin — SehatBook" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Unverified" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("admin");
  const { status } = await searchParams;
  const filter: FilterKey =
    status === "verified" || status === "unverified" ? status : "all";

  const supabase = await createClient();
  let query = supabase
    .from("doctors")
    .select(
      "id, pmc_number, specialty, photo_url, is_verified, created_at, profile:profiles!profile_id(full_name, email)",
    )
    .order("created_at", { ascending: false });
  if (filter !== "all") {
    query = query.eq("is_verified", filter === "verified");
  }

  const { data: doctors, error } = await query;
  if (error) throw new Error("Failed to load doctors");

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Doctors</h1>
          <p className="text-muted-foreground text-sm">
            Unverified doctors stay hidden from patients until verified.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/doctors/new">Onboard doctor</Link>
        </Button>
      </div>

      <div className="flex gap-1" role="group" aria-label="Filter by status">
        {FILTERS.map(({ key, label }) => (
          <Link
            key={key}
            href={
              key === "all" ? "/admin/doctors" : `/admin/doctors?status=${key}`
            }
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {doctors.length === 0 ? (
        <div className="border-border grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="font-medium">
            {filter === "all" ? "No doctors yet" : `No ${filter} doctors`}
          </p>
          <p className="text-muted-foreground text-sm">
            {filter === "all"
              ? "Onboard your first doctor to get started."
              : "Try a different filter."}
          </p>
          {filter === "all" && (
            <Button asChild variant="outline" className="mt-2">
              <Link href="/admin/doctors/new">Onboard doctor</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="border-border rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead>PMC number</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <DoctorAvatar
                        photoUrl={doctor.photo_url}
                        name={doctor.profile?.full_name ?? "?"}
                        size={32}
                      />
                      <span>
                        <span className="block font-medium">
                          {doctor.profile?.full_name}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {doctor.profile?.email}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {doctor.pmc_number}
                  </TableCell>
                  <TableCell>{doctor.specialty}</TableCell>
                  <TableCell>
                    {doctor.is_verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Unverified</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/doctors/${doctor.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
