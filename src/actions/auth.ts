"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as z from "zod";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/dal";
import { ROLE_HOME, postAuthPath, safeNextPath } from "@/lib/auth/routes";
import {
  completeProfileSchema,
  loginSchema,
  signupSchema,
} from "@/lib/validators/auth";

/**
 * Auth server actions — email/password today, designed so phone OTP can be
 * added as a second login method later WITHOUT restructuring:
 *
 * - Session handling is entirely @supabase/ssr cookies; Supabase phone OTP
 *   (`auth.signInWithOtp({ phone })` + `auth.verifyOtp({ phone, token,
 *   type: "sms" })`) produces the exact same session, so nothing downstream
 *   (proxy, DAL, RLS) changes.
 * - Post-login destination logic is centralized in `postAuthPath()`; an OTP
 *   verify action ends with the same `redirect(postAuthPath(...))` call.
 * - Phone numbers are already stored E.164-normalized (+92) on profiles, so
 *   OTP login can match `profiles.phone` / `auth.users.phone` directly.
 *
 * To add OTP later: create `requestOtp` and `verifyOtp` actions here with the
 * same `AuthFormState` contract, and add a method toggle on the login page.
 */

export type AuthFormState =
  | {
      /** Per-field validation errors, keyed by input name. */
      fieldErrors?: Record<string, string[]>;
      /** Form-level error (auth failures, unexpected errors). */
      formError?: string;
      /** Signup succeeded and a confirmation email was sent. */
      emailSent?: boolean;
    }
  | undefined;

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** Fetch the freshly-authenticated user's profile for post-auth routing. */
async function fetchPostAuthProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("role, phone")
    .eq("id", userId)
    .single();
  return data;
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/complete-profile`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return {
        formError: "An account with this email already exists. Log in instead.",
      };
    }
    if (error.code === "weak_password") {
      return { formError: "This password is too weak. Try a longer one." };
    }
    return { formError: "Could not create your account. Please try again." };
  }

  // With email confirmation ON, Supabase returns an obfuscated success for
  // existing emails: a user object with no identities. Don't claim an email
  // was sent in that case.
  if (data.user && data.user.identities?.length === 0) {
    return {
      formError: "An account with this email already exists. Log in instead.",
    };
  }

  // Email confirmation disabled → session exists, go straight to profile step.
  if (data.session) {
    redirect("/complete-profile");
  }

  return { emailSent: true };
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "invalid_credentials") {
      return { formError: "Incorrect email or password." };
    }
    if (error.code === "email_not_confirmed") {
      return {
        formError:
          "Please confirm your email first — check your inbox for the link.",
      };
    }
    return { formError: "Could not log you in. Please try again." };
  }

  const profile = await fetchPostAuthProfile(supabase, data.user.id);
  const next = safeNextPath(formData.get("next")?.toString());
  redirect(postAuthPath(profile, next));
}

export async function completeProfile(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const parsed = completeProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
    })
    .eq("id", user.id)
    .select("role")
    .single();

  if (error || !data) {
    // 23505 = unique_violation on profiles.phone
    if (error?.code === "23505") {
      return {
        fieldErrors: {
          phone: ["This phone number is already linked to another account."],
        },
      };
    }
    return { formError: "Could not save your profile. Please try again." };
  }

  redirect(ROLE_HOME[data.role]);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
