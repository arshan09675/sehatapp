"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { clinicSchema } from "@/lib/validators/admin";
import type { AdminFormState } from "@/actions/form-state";

/**
 * Clinic CRUD. Runs on the RLS-governed server client on purpose: the
 * clinics_admin_write policy already restricts writes to admins, so the
 * service-role client is not needed here. requireRole("admin") still gates
 * every action so non-admins are redirected before any query runs.
 */

function parseClinicForm(formData: FormData) {
  return clinicSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    area: formData.get("area"),
    city: formData.get("city"),
  });
}

export async function createClinic(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole("admin");

  const parsed = parseClinicForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clinics").insert(parsed.data);
  if (error) {
    return { formError: "Could not create the clinic. Please try again." };
  }

  revalidatePath("/admin/clinics");
  revalidatePath("/admin");
  redirect("/admin/clinics");
}

export async function updateClinic(
  clinicId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole("admin");

  if (!z.uuid().safeParse(clinicId).success) {
    return { formError: "Invalid clinic." };
  }

  const parsed = parseClinicForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinics")
    .update(parsed.data)
    .eq("id", clinicId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { formError: "Could not save the clinic. Please try again." };
  }
  if (!data) {
    return { formError: "Clinic not found — it may have been deleted." };
  }

  revalidatePath("/admin/clinics");
  redirect("/admin/clinics");
}

export async function deleteClinic(
  clinicId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  await requireRole("admin");

  if (!z.uuid().safeParse(clinicId).success) {
    return { formError: "Invalid clinic." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clinics").delete().eq("id", clinicId);

  if (error) {
    // 23503 foreign_key_violation: appointments reference this clinic
    // (doctor_clinics rows cascade, appointment history must not vanish).
    if (error.code === "23503") {
      return {
        formError:
          "This clinic has appointments and cannot be deleted. Remove its doctors instead so it stops taking bookings.",
      };
    }
    return { formError: "Could not delete the clinic. Please try again." };
  }

  revalidatePath("/admin/clinics");
  revalidatePath("/admin");
  redirect("/admin/clinics");
}
