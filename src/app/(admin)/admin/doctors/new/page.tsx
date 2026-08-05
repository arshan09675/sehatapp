import type { Metadata } from "next";
import Link from "next/link";

import { DoctorForm } from "@/components/admin/doctor-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Onboard doctor — Admin",
};

export default async function NewDoctorPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: clinics } = await supabase
    .from("clinics")
    .select("id, name, area, city")
    .order("name");

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Onboard doctor</h1>
        <p className="text-muted-foreground text-sm">
          Creates the doctor&rsquo;s login account and profile. A temporary
          password is generated and shown once after saving.
        </p>
      </div>

      {!clinics?.length ? (
        <Alert className="max-w-lg">
          <AlertTitle>Add a clinic first</AlertTitle>
          <AlertDescription className="grid justify-items-start gap-2">
            Every doctor needs at least one clinic assignment with a
            consultation fee.
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clinics/new">Add clinic</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <DoctorForm clinics={clinics} />
      )}
    </section>
  );
}
