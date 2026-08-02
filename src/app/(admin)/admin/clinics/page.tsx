import type { Metadata } from "next";
import Link from "next/link";

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

export const metadata: Metadata = { title: "Clinics — Admin — SehatBook" };

export default async function ClinicsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: clinics, error } = await supabase
    .from("clinics")
    .select("id, name, address, area, city")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to load clinics");

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clinics</h1>
          <p className="text-muted-foreground text-sm">
            Locations doctors practice at. Doctors are assigned per clinic with
            a consultation fee.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clinics/new">Add clinic</Link>
        </Button>
      </div>

      {clinics.length === 0 ? (
        <div className="border-border grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="font-medium">No clinics yet</p>
          <p className="text-muted-foreground text-sm">
            Add your first clinic — you&rsquo;ll need one before onboarding a
            doctor.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/admin/clinics/new">Add clinic</Link>
          </Button>
        </div>
      ) : (
        <div className="border-border rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinics.map((clinic) => (
                <TableRow key={clinic.id}>
                  <TableCell className="font-medium">{clinic.name}</TableCell>
                  <TableCell>{clinic.area}</TableCell>
                  <TableCell>{clinic.city}</TableCell>
                  <TableCell className="text-muted-foreground max-w-64 truncate">
                    {clinic.address}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/clinics/${clinic.id}/edit`}>
                        Edit
                      </Link>
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
