"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { specialties } from "@/components/landing/data";
import { SearchIcon } from "@/components/landing/icons";
import { btn, btnPrimary } from "@/components/landing/styles";
import { cn } from "@/lib/utils";

export type AreaOption = { name: string; city: string };

const FIELD =
  "bg-surface-dim flex flex-col gap-0.5 rounded-[11px] px-[15px] py-[9px]";
const LABEL =
  "text-ink-muted text-[11.5px] font-semibold tracking-[.05em] uppercase";
const CONTROL =
  "text-ink w-full cursor-pointer appearance-none border-none bg-transparent py-0.5 font-sans text-base font-medium outline-none";

/**
 * Search + filters for /doctors.
 *
 * State lives entirely in the URL: results are shareable, back and forward
 * behave, and the server component re-runs the query. Areas narrow to the
 * chosen city, mirroring the admin clinic form.
 */
export function SearchFilters({
  areas,
  initial,
}: {
  areas: AreaOption[];
  initial: { q?: string; city?: string; area?: string; specialty?: string };
}) {
  const router = useRouter();
  const cities = useMemo(
    () => [...new Set(areas.map((area) => area.city))],
    [areas],
  );
  const [city, setCity] = useState(initial.city ?? "");
  const cityAreas = areas.filter((area) => !city || area.city === city);

  const hasFilters = Boolean(
    initial.q || initial.city || initial.area || initial.specialty,
  );

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const next = new URLSearchParams();
          for (const key of ["q", "city", "area", "specialty"] as const) {
            const value = String(form.get(key) ?? "").trim();
            if (value) next.set(key, value);
          }
          const query = next.toString();
          router.push(query ? `/doctors?${query}` : "/doctors");
        }}
        className="bg-surface shadow-lift grid gap-2.5 rounded-2xl p-3 max-[860px]:grid-cols-1 min-[861px]:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto]"
      >
        <div className={FIELD}>
          <label htmlFor="f-q" className={LABEL}>
            Doctor or concern
          </label>
          <input
            id="f-q"
            name="q"
            defaultValue={initial.q ?? ""}
            placeholder="Name, specialty…"
            maxLength={80}
            className={cn(CONTROL, "cursor-text")}
          />
        </div>

        <div className={FIELD}>
          <label htmlFor="f-city" className={LABEL}>
            City
          </label>
          <select
            id="f-city"
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={CONTROL}
          >
            <option value="">Any city</option>
            {cities.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className={FIELD}>
          <label htmlFor="f-area" className={LABEL}>
            Area
          </label>
          <select
            id="f-area"
            name="area"
            defaultValue={initial.area ?? ""}
            className={CONTROL}
          >
            <option value="">Any area</option>
            {cityAreas.map((area) => (
              <option key={`${area.city}-${area.name}`} value={area.name}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className={FIELD}>
          <label htmlFor="f-spec" className={LABEL}>
            Specialty
          </label>
          <select
            id="f-spec"
            name="specialty"
            defaultValue={initial.specialty ?? ""}
            className={CONTROL}
          >
            <option value="">Any specialty</option>
            {specialties.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className={cn(
            btn,
            btnPrimary,
            "min-h-[58px] px-[30px] text-base max-[860px]:min-h-[52px]",
          )}
        >
          <SearchIcon className="size-[17px] flex-none" />
          Search
        </button>
      </form>

      {hasFilters && (
        <div className="mt-3">
          <Link
            href="/doctors"
            className="text-brand-strong text-sm font-semibold underline underline-offset-2"
          >
            Clear all filters
          </Link>
        </div>
      )}
    </div>
  );
}
