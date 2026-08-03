"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import {
  APPOINTMENT_STATUSES,
  isTerminal,
  STATUS_LABEL,
  statusesAllowing,
  type AppointmentStatus,
} from "@/lib/appointments";
import { requireDoctor } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { cancelReasonSchema } from "@/lib/validators/doctor";
import type { AdminFormState } from "@/actions/form-state";

/**
 * Doctor-side appointment status changes.
 *
 * Two layers guard the transition rules. Here, the set of legal source
 * statuses goes into the UPDATE itself, so the check and the write are one
 * atomic statement. In the database, appointments_status_guard
 * (0003_doctor_dashboard.sql) enforces the same rules for anyone reaching
 * PostgREST directly — appt_doctor_update has no with check(), so the server
 * action is not a chokepoint on its own.
 */

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The UPDATE matched no row. Re-read it to say why, rather than showing a
 * generic failure: the appointment is gone, or it is already in a status this
 * action cannot move it out of.
 */
async function explainRejection(
  supabase: ServerClient,
  appointmentId: string,
  doctorId: string,
  next: AppointmentStatus,
): Promise<string> {
  const { data } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", appointmentId)
    .eq("doctor_id", doctorId)
    .maybeSingle();

  if (!data) {
    return "That appointment is no longer available. Refresh to see the latest list.";
  }
  if (data.status === next) {
    return `This appointment is already ${STATUS_LABEL[next].toLowerCase()}.`;
  }
  if (isTerminal(data.status)) {
    return `This appointment is already ${STATUS_LABEL[data.status].toLowerCase()} and cannot be changed.`;
  }
  return `Confirm this appointment before marking it ${STATUS_LABEL[next].toLowerCase()}.`;
}

/**
 * The target status arrives as the value of the submit button that was
 * pressed (`name="next"`), so one form drives every action on a row and the
 * buttons keep working before hydration.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { doctor } = await requireDoctor();

  if (!z.uuid().safeParse(appointmentId).success) {
    return { formError: "Invalid appointment." };
  }

  const requested = formData.get("next");
  if (
    typeof requested !== "string" ||
    !APPOINTMENT_STATUSES.includes(requested as AppointmentStatus)
  ) {
    return { formError: "That is not a change you can make." };
  }
  const next = requested as AppointmentStatus;

  const allowedFrom = statusesAllowing(next);
  if (allowedFrom.length === 0) {
    return { formError: "That is not a change you can make." };
  }

  let cancelReason: string | null = null;
  if (next === "cancelled") {
    const parsed = cancelReasonSchema.safeParse(
      formData.get("cancelReason") ?? undefined,
    );
    if (!parsed.success) {
      return {
        fieldErrors: { cancelReason: [parsed.error.issues[0].message] },
      };
    }
    cancelReason = parsed.data;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: next,
      ...(next === "cancelled" ? { cancel_reason: cancelReason } : {}),
    })
    .eq("id", appointmentId)
    .eq("doctor_id", doctor.id)
    // The transition check IS the query — no read-then-write window for a
    // concurrent update to slip through.
    .in("status", allowedFrom as AppointmentStatus[])
    .select("id")
    .maybeSingle();

  if (error) {
    return { formError: "Could not update the appointment. Please try again." };
  }
  if (!data) {
    return {
      formError: await explainRejection(
        supabase,
        appointmentId,
        doctor.id,
        next,
      ),
    };
  }

  revalidatePath("/doctor");
  return {};
}
