"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import * as z from "zod";

import { getUser } from "@/lib/auth/dal";
import { notifyBookingRequested, notifyPatientCancelled } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import { patientNoteSchema, slotStartSchema } from "@/lib/validators/booking";
import { cancelReasonSchema } from "@/lib/validators/doctor";
import type { AdminActionResult, AdminFormState } from "@/actions/form-state";

/**
 * Patient-side booking.
 *
 * Bookings go through the book_appointment RPC and nothing else — never a
 * direct insert. The RPC holds an advisory lock for the doctor+slot, re-checks
 * the schedule, the leave exceptions, and the double-booking index, and is the
 * only reason two people racing for one slot cannot both win. There is also no
 * INSERT policy on `appointments` at all, so a direct insert would fail
 * anyway; the point is that the RPC is where the rules live.
 */

/**
 * Every code book_appointment can raise, mapped to plain language.
 *
 * supabase-js surfaces a `raise exception 'CODE'` in error.message. Covering
 * all seven — including the two the brief did not list — means an unmapped
 * code can never reach a patient as a raw Postgres string.
 */
const BOOKING_ERRORS: ReadonlyArray<[code: string, message: string]> = [
  [
    "SLOT_TAKEN",
    "That slot was just booked by someone else. Pick another time.",
  ],
  ["DOCTOR_ON_LEAVE", "The doctor is on leave that day. Try another date."],
  [
    "INVALID_SLOT",
    "That time is no longer part of the doctor's hours. Refresh the page and pick another.",
  ],
  ["SLOT_IN_PAST", "That time has already passed. Pick a later slot."],
  ["DOCTOR_NOT_VERIFIED", "This doctor is not accepting bookings right now."],
  ["DOCTOR_NOT_AT_CLINIC", "This doctor no longer practises at that clinic."],
  ["AUTH_REQUIRED", "Sign in to book this appointment."],
];

function bookingErrorMessage(raw: string): string {
  const match = BOOKING_ERRORS.find(([code]) => raw.includes(code));
  return match?.[1] ?? "Could not book that appointment. Please try again.";
}

export type BookingState =
  | (AdminActionResult & {
      /** Set when the slot went while the patient was deciding, so the
       *  picker knows to re-sync rather than just show the message. */
      slotTaken?: true;
    })
  | undefined;

export async function bookAppointment(
  doctorId: string,
  clinicId: string,
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  if (
    !z.uuid().safeParse(doctorId).success ||
    !z.uuid().safeParse(clinicId).success
  ) {
    return { formError: "That doctor or clinic is no longer available." };
  }

  const slot = slotStartSchema.safeParse(formData.get("slotStart"));
  if (!slot.success) {
    return { formError: "Pick a time slot before booking." };
  }

  const note = patientNoteSchema.safeParse(
    formData.get("patientNote") ?? undefined,
  );
  if (!note.success) {
    return { fieldErrors: { patientNote: [note.error.issues[0].message] } };
  }

  // Not signed in: send them to log in and come straight back to this slot.
  // safeNextPath (lib/auth/routes.ts) rejects anything not starting with a
  // single "/", so this cannot become an open redirect.
  const user = await getUser();
  if (!user) {
    const resume = `/doctors/${doctorId}?clinic=${clinicId}&slot=${encodeURIComponent(slot.data)}`;
    redirect(`/login?next=${encodeURIComponent(resume)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_doctor_id: doctorId,
    p_clinic_id: clinicId,
    p_slot_start: slot.data,
    // The RPC's arg is optional, not nullable — send nothing rather than null.
    p_note: note.data ?? undefined,
  });

  if (error) {
    return {
      formError: bookingErrorMessage(error.message),
      slotTaken: error.message.includes("SLOT_TAKEN") ? true : undefined,
    };
  }

  const appointment = data as { id: string } | null;
  if (!appointment) {
    return { formError: "Could not book that appointment. Please try again." };
  }

  // after() rather than an await: the patient should not wait on an SMS
  // round-trip, and Next dispatches server actions one at a time per client so
  // a slow send would also stall their next action. It still runs despite the
  // redirect() below — next/server's `after` fires even when redirect() throws.
  after(() => notifyBookingRequested(appointment.id));

  revalidatePath("/dashboard");
  revalidatePath(`/doctors/${doctorId}`);
  redirect(`/dashboard?booked=${appointment.id}`);
}

/**
 * Patient cancellation.
 *
 * The status filter rides in the UPDATE so the check and the write are one
 * atomic statement. appointments_status_guard (0003) independently enforces
 * that a patient can only ever reach 'cancelled', so this holds even for a
 * request that skips the action entirely.
 */
export async function cancelAppointment(
  appointmentId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await getUser();
  if (!user) redirect("/login?next=%2Fdashboard");

  if (!z.uuid().safeParse(appointmentId).success) {
    return { formError: "That appointment is no longer available." };
  }

  const reason = cancelReasonSchema.safeParse(
    formData.get("cancelReason") ?? undefined,
  );
  if (!reason.success) {
    return { fieldErrors: { cancelReason: [reason.error.issues[0].message] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled", cancel_reason: reason.data })
    .eq("id", appointmentId)
    .eq("patient_id", user.id)
    .in("status", ["pending", "confirmed"])
    .select("id")
    .maybeSingle();

  if (error) {
    return { formError: "Could not cancel the appointment. Please try again." };
  }
  if (!data) {
    return {
      formError:
        "This appointment can no longer be cancelled — it may already be completed or cancelled. Refresh to see the latest.",
    };
  }

  // Only after the UPDATE matched: the doctor is told their slot reopened, and
  // nothing is sent for a cancellation that did not happen.
  after(() => notifyPatientCancelled(appointmentId));

  revalidatePath("/dashboard");
  return {};
}
