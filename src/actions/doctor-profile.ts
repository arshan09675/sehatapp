"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { requireDoctor } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DOCTOR_PHOTO_MAX_BYTES,
  DOCTOR_PHOTO_TYPES,
} from "@/lib/validators/admin";
import { doctorProfileSchema } from "@/lib/validators/doctor";
import type { AdminFormState } from "@/actions/form-state";

/**
 * The doctor's own profile editor.
 *
 * Text fields go through the RLS server client: doctors_self_update already
 * scopes updates to the caller's own row, so the service-role client is not
 * needed. The photo is the exception — the doctor-photos bucket has a
 * public-read policy and deliberately no write policies
 * (0002_admin_areas_storage.sql), so uploads must use the admin client.
 *
 * The .update() column list is spelled out by hand on purpose. Spreading
 * parsed input is how is_verified eventually leaks into a self-service form;
 * the 0003 guard trigger backstops that, but this action should not depend
 * on the backstop.
 */
export async function updateDoctorProfile(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { profile, doctor } = await requireDoctor();

  const parsed = doctorProfileSchema.safeParse({
    specialty: formData.get("specialty"),
    qualifications: formData.get("qualifications") ?? undefined,
    bio: formData.get("bio") ?? undefined,
    experienceYears: formData.get("experienceYears") ?? undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const photoEntry = formData.get("photo");
  const photo =
    photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;
  if (photo) {
    if (!(photo.type in DOCTOR_PHOTO_TYPES)) {
      return {
        fieldErrors: { photo: ["Photo must be a JPEG, PNG, or WebP image."] },
      };
    }
    if (photo.size > DOCTOR_PHOTO_MAX_BYTES) {
      return { fieldErrors: { photo: ["Photo must be 2 MB or smaller."] } };
    }
  }

  let photoUrl: string | null = null;
  if (photo) {
    const admin = createAdminClient();
    const path = `${profile.id}/profile.${DOCTOR_PHOTO_TYPES[photo.type]}`;

    const { error: uploadError } = await admin.storage
      .from("doctor-photos")
      .upload(path, await photo.arrayBuffer(), {
        contentType: photo.type,
        upsert: true,
      });
    if (uploadError) {
      return {
        fieldErrors: { photo: ["Photo upload failed. Please try again."] },
      };
    }

    // Switching format (png → jpg) writes a new object and orphans the old
    // one, so clear the other extensions for this user.
    const stale = Object.values(DOCTOR_PHOTO_TYPES)
      .map((ext) => `${profile.id}/profile.${ext}`)
      .filter((candidate) => candidate !== path);
    await admin.storage.from("doctor-photos").remove(stale);

    // The path is stable across re-uploads, so the public URL is too — without
    // a cache-buster the CDN keeps serving the previous image.
    const { publicUrl } = admin.storage
      .from("doctor-photos")
      .getPublicUrl(path).data;
    photoUrl = `${publicUrl}?v=${Date.now()}`;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctors")
    .update({
      specialty: parsed.data.specialty,
      qualifications: parsed.data.qualifications,
      bio: parsed.data.bio,
      experience_years: parsed.data.experienceYears,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    .eq("id", doctor.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { formError: "Could not save your profile. Please try again." };
  }
  if (!data) {
    return {
      formError:
        "Your profile could not be found. Sign out, sign back in, and try again.",
    };
  }

  revalidatePath("/doctor/profile");
  revalidatePath("/doctor");
  return {};
}
