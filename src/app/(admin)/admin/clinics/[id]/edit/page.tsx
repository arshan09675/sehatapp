import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClinicForm } from "@/components/admin/clinic-form";
import { DeleteClinicButton } from "@/components/admin/delete-clinic-button";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit clinic — Admin — SehatBook" };

export default async function EditClinicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: clinic }, { data: areas }] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, name, address, area, city")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("areas").select("name, city").order("name"),
  ]);

  if (!clinic) notFound();

  return (
    <section className="grid gap-8">
      <div className="grid gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Edit {clinic.name}
        </h1>
        <ClinicForm areas={areas ?? []} clinic={clinic} />
      </div>

      <div className="border-destructive/30 grid max-w-lg gap-2 rounded-xl border p-4">
        <h2 className="text-sm font-medium">Danger zone</h2>
        <p className="text-muted-foreground text-sm">
          Deleting a clinic removes all doctor assignments to it. Clinics with
          existing appointments cannot be deleted.
        </p>
        <DeleteClinicButton clinicId={clinic.id} clinicName={clinic.name} />
      </div>
    </section>
  );
}
