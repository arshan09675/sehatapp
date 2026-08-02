import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Dashboard — SehatBook" };

export default async function PatientDashboardPage() {
  const profile = await requireRole("patient");

  return (
    <section className="grid gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        Assalam-o-Alaikum, {profile.full_name}
      </h1>
      <p className="text-muted-foreground">
        Your upcoming appointments will appear here once booking opens
        (Phase&nbsp;4).
      </p>
    </section>
  );
}
