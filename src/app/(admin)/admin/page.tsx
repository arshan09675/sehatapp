import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin — SehatBook" };

export default async function AdminHomePage() {
  const profile = await requireRole("admin");
  const supabase = await createClient();

  const [clinics, doctors, unverified] = await Promise.all([
    supabase.from("clinics").select("id", { count: "exact", head: true }),
    supabase.from("doctors").select("id", { count: "exact", head: true }),
    supabase
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", false),
  ]);

  const cards = [
    {
      href: "/admin/clinics",
      title: "Clinics",
      count: clinics.count ?? 0,
      description: "Locations doctors practice at",
    },
    {
      href: "/admin/doctors",
      title: "Doctors",
      count: doctors.count ?? 0,
      description: "Onboarded doctor accounts",
    },
    {
      href: "/admin/verification",
      title: "Awaiting verification",
      count: unverified.count ?? 0,
      description: "PMC numbers to check",
    },
  ];

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {profile.full_name}
        </h1>
        <p className="text-muted-foreground">
          Manage clinics, onboard doctors, and verify PMC registrations.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-semibold tabular-nums">
                  {card.count}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
