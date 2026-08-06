/**
 * Static vocabulary for the public search surfaces.
 *
 * The placeholder doctors and slot days that lived here were removed in
 * Phase 4 — those now come from Supabase (see src/lib/public-doctors.ts).
 *
 * The specialty list moved to src/lib/specialties.ts in Phase 7, where triage
 * can reach it without importing from a components directory. Re-exported here
 * so the search surfaces keep their existing import.
 */
export { specialties, type Specialty } from "@/lib/specialties";
