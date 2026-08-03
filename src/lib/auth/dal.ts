import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type UserRole } from "@/lib/auth/routes";

/**
 * Data Access Layer for auth. Pages, layouts, and server actions call these
 * instead of talking to Supabase auth directly, so authorization rules live
 * in one place. The proxy only does optimistic redirects; these checks are
 * the authoritative ones (RLS is the final backstop).
 */

/** Authenticated Supabase user, validated against the Auth server. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  email: string | null;
};

/** The current user's profile row, or null when logged out. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, email")
    .eq("id", user.id)
    .single();
  return data;
});

export type DoctorRecord = {
  id: string;
  profile_id: string;
  pmc_number: string;
  specialty: string;
  qualifications: string | null;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  is_verified: boolean;
};

/**
 * The doctors row for the current user, or null.
 *
 * Note the lookup is by profile_id, not id: requireRole("doctor") returns a
 * Profile whose `id` is the auth user id, while everything schedule-related
 * keys off doctors.id. Returns null when a profiles.role='doctor' row exists
 * without a matching doctors row — requireRole only checks the profile, so
 * that state is reachable and callers must handle it.
 */
export const getDoctor = cache(async (): Promise<DoctorRecord | null> => {
  const profile = await getProfile();
  if (!profile || profile.role !== "doctor") return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("doctors")
    .select(
      "id, profile_id, pmc_number, specialty, qualifications, bio, photo_url, experience_years, is_verified",
    )
    .eq("profile_id", profile.id)
    .maybeSingle();
  return data;
});

/** Require a session; redirect to /login otherwise. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
 * Require a session with a completed profile and the given role.
 * Wrong role → sent to their own area; incomplete → complete-profile.
 */
export async function requireRole(role: UserRole): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.phone) redirect("/complete-profile");
  if (profile.role !== role) redirect(ROLE_HOME[profile.role]);
  return profile;
}

/**
 * Require the doctor role *and* a doctors row. Everything under /doctor needs
 * doctors.id, so this is the entry point for those pages and actions.
 * Throws (rather than redirecting) on the missing-doctors-row case: it means
 * onboarding left the account half-built, which is an error the admin has to
 * fix, not something the doctor can navigate out of.
 */
export async function requireDoctor(): Promise<{
  profile: Profile;
  doctor: DoctorRecord;
}> {
  const profile = await requireRole("doctor");
  const doctor = await getDoctor();
  if (!doctor) {
    throw new Error(
      "Doctor account is incomplete: no doctors row for this profile.",
    );
  }
  return { profile, doctor };
}
