import type { Database } from "@/lib/supabase/database.types";

/**
 * Role-based routing rules, shared by the proxy (optimistic redirects) and
 * server actions / DAL (authoritative redirects). Pure functions only — this
 * module must stay importable from proxy.ts.
 */
export type UserRole = Database["public"]["Enums"]["user_role"];

export const ROLE_HOME: Record<UserRole, string> = {
  patient: "/dashboard",
  doctor: "/doctor",
  admin: "/admin",
};

/** Route-area prefixes that require a specific role. */
const AREA_ROLES: Array<[prefix: string, role: UserRole]> = [
  ["/dashboard", "patient"],
  ["/doctor", "doctor"],
  ["/admin", "admin"],
];

/** The role required for a pathname, or null if the path is not role-gated. */
export function requiredRoleForPath(pathname: string): UserRole | null {
  for (const [prefix, role] of AREA_ROLES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return role;
  }
  return null;
}

/** Paths that require any authenticated user (beyond the role areas). */
export function isAuthRequiredPath(pathname: string): boolean {
  return (
    requiredRoleForPath(pathname) !== null || pathname === "/complete-profile"
  );
}

/** Auth pages a logged-in user should be bounced away from. */
export function isAuthPage(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

/**
 * Only allow internal redirect targets ("/x..."), never "//host" or
 * absolute URLs — prevents open-redirect via the ?next= param.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

/**
 * Where to send a user right after authentication.
 * Profile incomplete (no phone yet) → finish it first; phone is required
 * for SMS notifications (Phase 5).
 *
 * The pending destination rides along through /complete-profile rather than
 * being dropped: a patient who picked a slot, was sent to log in, and turns
 * out to have no phone on file must still land back on that slot afterwards.
 */
export function postAuthPath(
  profile: { role: UserRole; phone: string | null } | null,
  next?: string | null,
): string {
  const resume = safeNextPath(next);
  if (!profile || !profile.phone) {
    return resume
      ? `/complete-profile?next=${encodeURIComponent(resume)}`
      : "/complete-profile";
  }
  return resume ?? ROLE_HOME[profile.role];
}
