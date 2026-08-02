import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Doctor Panel — SehatBook" };

export default async function DoctorHomePage() {
  const profile = await requireRole("doctor");

  return (
    <section className="grid gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {profile.full_name}
      </h1>
      <p className="text-muted-foreground">
        Your schedule manager and appointment list arrive in Phase&nbsp;3.
      </p>
    </section>
  );
}
