/**
 * Static vocabulary for the public search surfaces.
 *
 * The placeholder doctors and slot days that lived here were removed in
 * Phase 4 — those now come from Supabase (see src/lib/public-doctors.ts).
 *
 * One list serves both the chips and the search dropdown. The reference used
 * two different forms of every specialty ("Dermatology" on the chips,
 * "Dermatologist" in the dropdown); doctors register free text, and the
 * search_tsv column stems specialty with the english config, so either form
 * matches whatever a doctor typed.
 */
export const specialties = [
  "General Physician",
  "Dermatology",
  "Cardiology",
  "Pediatrics",
  "Dentistry",
  "Gynecology",
  "Orthopedics",
  "ENT",
] as const;
