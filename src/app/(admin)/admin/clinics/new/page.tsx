import type { Metadata } from "next";

import { ClinicForm } from "@/components/admin/clinic-form";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add clinic — Admin" };

export default async function NewClinicPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: areas } = await supabase
    .from("areas")
    .select("name, city")
    .order("name");

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Add clinic</h1>
        <p className="text-muted-foreground text-sm">
          Doctors get assigned to clinics with a per-clinic fee.
        </p>
      </div>
      <ClinicForm areas={areas ?? []} />
    </section>
  );
}
