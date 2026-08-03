import type { Metadata } from "next";
import Link from "next/link";

import { DoctorCard } from "@/components/landing/doctor-card";
import { container } from "@/components/landing/styles";
import { PublicShell } from "@/components/public/public-shell";
import { SearchFilters } from "@/components/public/search-filters";
import { searchDoctors } from "@/lib/public-doctors";
import { createClient } from "@/lib/supabase/server";
import { doctorSearchParamsSchema } from "@/lib/validators/booking";

export const metadata: Metadata = {
  title: "Find a doctor — SehatBook",
  description:
    "Book PMC-verified doctors in Lahore. Real availability, fees shown upfront, no booking fee.",
};

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const single = (key: string) => {
    const value = raw[key];
    return typeof value === "string" ? value : undefined;
  };

  // Unparseable filters fall back to "no filter" rather than erroring — a
  // hand-edited URL should still show doctors.
  const parsed = doctorSearchParamsSchema.safeParse({
    q: single("q"),
    city: single("city"),
    area: single("area"),
    specialty: single("specialty"),
  });
  const filters = parsed.success ? parsed.data : {};

  const supabase = await createClient();
  const [results, areas] = await Promise.all([
    searchDoctors(filters),
    supabase.from("areas").select("name, city").order("city").order("name"),
  ]);

  const hasFilters = Boolean(
    filters.q || filters.city || filters.area || filters.specialty,
  );

  return (
    <PublicShell>
      <div className={container}>
        <SearchFilters areas={areas.data ?? []} initial={filters} />

        <div className="mt-8 mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-heading text-ink text-[clamp(24px,3.2vw,34px)] font-semibold tracking-[-0.01em]">
            {filters.area
              ? `Doctors in ${filters.area}`
              : filters.city
                ? `Doctors in ${filters.city}`
                : "Doctors in Lahore"}
          </h1>
          <span className="text-ink-muted text-sm">
            {results.length === 0
              ? "No results"
              : `${results.length} ${results.length === 1 ? "doctor" : "doctors"} · soonest availability first`}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="border-line grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
            <p className="text-ink font-medium">
              {hasFilters
                ? "No doctors match these filters"
                : "No doctors are listed yet"}
            </p>
            <p className="text-ink-muted max-w-md text-sm">
              {hasFilters
                ? "Try a different area or specialty, or clear the filters to see everyone available."
                : "Doctors appear here once an administrator has verified their PMC registration."}
            </p>
            {hasFilters && (
              <Link
                href="/doctors"
                className="text-brand-strong mt-2 text-sm font-semibold underline underline-offset-2"
              >
                Clear all filters
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
            {results.map((doctor, index) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                delay={(index % 4) * 70}
              />
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
