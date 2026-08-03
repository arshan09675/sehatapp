/**
 * Presentation helpers for doctor surfaces. Pure and free of `server-only`, so
 * the same strings render on the search cards, the profile panel, and the
 * patient's appointment list.
 */

export function formatFee(feePkr: number): string {
  return `Rs. ${feePkr.toLocaleString("en-PK")}`;
}

/**
 * The card's single meta line, e.g.
 * "Dermatologist · MBBS, FCPS · 8 yrs experience".
 * Segments are dropped when absent rather than rendered empty, so a doctor
 * with no qualifications on file does not get a stray separator.
 */
export function doctorMetaLine(
  specialty: string,
  qualifications?: string | null,
  experienceYears?: number | null,
): string {
  const parts = [specialty];
  if (qualifications) parts.push(qualifications);
  if (experienceYears !== null && experienceYears !== undefined) {
    parts.push(`${experienceYears} yrs experience`);
  }
  return parts.join(" · ");
}

/** "Hameed Latif Hospital, Garden Town" — clinic and area as one string. */
export function clinicLine(clinic: { name: string; area: string }): string {
  return `${clinic.name}, ${clinic.area}`;
}
