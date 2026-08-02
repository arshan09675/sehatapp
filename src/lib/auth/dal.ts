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
