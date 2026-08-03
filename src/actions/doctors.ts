"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createDoctorSchema,
  DOCTOR_PHOTO_MAX_BYTES,
  DOCTOR_PHOTO_TYPES,
} from "@/lib/validators/admin";
import type {
  AdminFormState,
  CreateDoctorState,
  ResetPasswordState,
} from "@/actions/form-state";

/**
 * Doctor onboarding + verification. These actions use the SERVICE-ROLE
 * client (auth admin API, role changes, verification stamps), so every one
 * of them MUST verify the caller is an admin first — requireRole("admin")
 * redirects anyone else away before the admin client is even created.
 */

/**
 * One-time password the admin hands to the doctor over WhatsApp/SMS.
 * See docs/DOCTOR_ONBOARDING.md for the full first-login flow.
 */
function generateTempPassword(): string {
  return `Sb-${randomBytes(9).toString("base64url")}`;
}

const uuidSchema = z.uuid();

function revalidateDoctorPages(doctorId?: string) {
  revalidatePath("/admin/doctors");
  revalidatePath("/admin/verification");
  revalidatePath("/admin");
  if (doctorId) revalidatePath(`/admin/doctors/${doctorId}`);
}

export async function createDoctor(
  _prev: CreateDoctorState,
  formData: FormData,
): Promise<CreateDoctorState> {
  await requireRole("admin");

  // Clinic assignments come as checkbox values (clinic=<id>) with a paired
  // fee input (fee_<id>) per clinic.
  const clinicIds = formData.getAll("clinic").map(String);
  const parsed = createDoctorSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    pmcNumber: formData.get("pmcNumber"),
    specialty: formData.get("specialty"),
    qualifications: formData.get("qualifications") ?? undefined,
    bio: formData.get("bio") ?? undefined,
    experienceYears: formData.get("experienceYears") ?? undefined,
    clinics: clinicIds.map((id) => ({
      clinicId: id,
      feePkr: formData.get(`fee_${id}`),
    })),
  });

  if (!parsed.success) {
    // Re-key clinic array errors (clinics.N.feePkr) to the actual fee input
    // names (fee_<clinicId>) so they render next to the right field.
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      let key: string;
      if (issue.path[0] === "clinics" && typeof issue.path[1] === "number") {
        key = `fee_${clinicIds[issue.path[1]]}`;
      } else {
        key = String(issue.path[0] ?? "form");
      }
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { fieldErrors };
  }
  const input = parsed.data;

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

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });

  if (createError || !created.user) {
    if (createError?.code === "email_exists") {
      return {
        fieldErrors: {
          email: ["An account with this email already exists."],
        },
      };
    }
    return {
      formError: "Could not create the doctor's account. Please try again.",
    };
  }
  const userId = created.user.id;
  let photoPath: string | null = null;

  // Any failure past this point must undo the auth user (which cascades to
  // profiles → doctors → doctor_clinics) and any uploaded photo, so a retry
  // starts clean instead of hitting email_exists.
  const rollback = async (state: CreateDoctorState) => {
    if (photoPath) {
      await admin.storage.from("doctor-photos").remove([photoPath]);
    }
    await admin.auth.admin.deleteUser(userId);
    return state;
  };

  // The signup trigger already inserted a patient profile; promote it.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      role: "doctor",
      full_name: input.fullName,
      phone: input.phone,
    })
    .eq("id", userId);

  if (profileError) {
    if (profileError.code === "23505") {
      return rollback({
        fieldErrors: {
          phone: ["This phone number is already linked to another account."],
        },
      });
    }
    return rollback({
      formError: "Could not save the doctor's profile. Please try again.",
    });
  }

  let photoUrl: string | null = null;
  if (photo) {
    photoPath = `${userId}/profile.${DOCTOR_PHOTO_TYPES[photo.type]}`;
    const { error: uploadError } = await admin.storage
      .from("doctor-photos")
      .upload(photoPath, await photo.arrayBuffer(), {
        contentType: photo.type,
        upsert: true,
      });
    if (uploadError) {
      photoPath = null;
      return rollback({
        fieldErrors: { photo: ["Photo upload failed. Please try again."] },
      });
    }
    photoUrl = admin.storage.from("doctor-photos").getPublicUrl(photoPath)
      .data.publicUrl;
  }

  const { data: doctor, error: doctorError } = await admin
    .from("doctors")
    .insert({
      profile_id: userId,
      // Denormalised so public pages never have to read profiles, which RLS
      // keeps private. doctors_search_sync re-derives it from profiles on
      // write, so this value only has to be right, not authoritative.
      full_name: input.fullName,
      pmc_number: input.pmcNumber,
      specialty: input.specialty,
      qualifications: input.qualifications,
      bio: input.bio,
      experience_years: input.experienceYears,
      photo_url: photoUrl,
    })
    .select("id")
    .single();

  if (doctorError || !doctor) {
    if (doctorError?.code === "23505") {
      return rollback({
        fieldErrors: {
          pmcNumber: ["A doctor with this PMC number is already registered."],
        },
      });
    }
    return rollback({
      formError: "Could not create the doctor record. Please try again.",
    });
  }

  const { error: assignError } = await admin.from("doctor_clinics").insert(
    input.clinics.map((c) => ({
      doctor_id: doctor.id,
      clinic_id: c.clinicId,
      fee_pkr: c.feePkr,
    })),
  );
  if (assignError) {
    return rollback({
      formError: "Could not assign the doctor to clinics. Please try again.",
    });
  }

  revalidateDoctorPages(doctor.id);
  return {
    created: {
      doctorId: doctor.id,
      email: input.email,
      fullName: input.fullName,
      tempPassword,
    },
  };
}

/**
 * Stamp a doctor as verified after the admin manually checked the PMC
 * number against the PMDC public register. Admin-only column flips, so this
 * uses the service-role client (RLS has no column-level guard here).
 */
export async function verifyDoctor(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const adminProfile = await requireRole("admin");

  const doctorId = uuidSchema.safeParse(formData.get("doctorId"));
  if (!doctorId.success) return { formError: "Invalid doctor." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("doctors")
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: adminProfile.id,
    })
    .eq("id", doctorId.data)
    .eq("is_verified", false)
    .select("id")
    .maybeSingle();

  if (error) {
    return { formError: "Could not verify the doctor. Please try again." };
  }
  if (!data) {
    return { formError: "Doctor not found or already verified." };
  }

  revalidateDoctorPages(doctorId.data);
  return {};
}

/**
 * Issue a fresh temporary password for a doctor who lost theirs.
 * Shown once to the admin, same handover flow as onboarding.
 */
export async function resetDoctorPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  await requireRole("admin");

  const doctorId = uuidSchema.safeParse(formData.get("doctorId"));
  if (!doctorId.success) return { formError: "Invalid doctor." };

  const admin = createAdminClient();
  const { data: doctor, error: doctorError } = await admin
    .from("doctors")
    .select("profile_id, profile:profiles!profile_id(full_name, email)")
    .eq("id", doctorId.data)
    .maybeSingle();

  if (doctorError || !doctor) {
    return { formError: "Doctor not found." };
  }

  const tempPassword = generateTempPassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(
    doctor.profile_id,
    { password: tempPassword },
  );
  if (updateError) {
    return { formError: "Could not reset the password. Please try again." };
  }

  return {
    credentials: {
      email: doctor.profile?.email ?? "",
      fullName: doctor.profile?.full_name ?? "",
      tempPassword,
    },
  };
}
