/**
 * The specialty vocabulary, shared by the search surfaces and by triage.
 *
 * One list serves the chips, the search dropdown, and the triage classifier.
 * The reference used two different forms of every specialty ("Dermatology" on
 * the chips, "Dermatologist" in the dropdown); doctors register free text, and
 * the search_tsv column stems specialty with the english config, so either form
 * matches whatever a doctor typed.
 *
 * That stemming is also why triage must pick from *this* list and nothing else.
 * searchDoctors (src/lib/public-doctors.ts) folds `specialty` into a
 * websearch_to_tsquery rather than an equality filter, so "Dermatology" finds a
 * doctor registered as "Dermatologist" — but an invented specialty like
 * "Neurology" would send the patient to an empty results page. The triage
 * schema enforces membership as a Zod enum.
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

export type Specialty = (typeof specialties)[number];
