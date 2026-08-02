import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Admin — SehatBook" };

export default async function AdminHomePage() {
  const profile = await requireRole("admin");

  return (
    <section className="grid gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        Admin — {profile.full_name}
      </h1>
      <p className="text-muted-foreground">
        Clinic and doctor management arrives in Phase&nbsp;2.
      </p>
    </section>
  );
}
