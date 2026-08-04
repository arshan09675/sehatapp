import "server-only";

import type { AppointmentStatus } from "@/lib/appointments";
import { createAdminClient } from "@/lib/supabase/admin";

import { send } from "./send";
import type { AppointmentContext } from "./templates";
import type { NotifyOutcome, TemplateId } from "./types";
import type { ReminderWindow } from "./due";

/**
 * Turns an appointment id into the two people it concerns and the facts a
 * template needs.
 *
 * Note the doctor hop. appointments.doctor_id is doctors.id, NOT a profile id
 * (auth/dal.ts:59-67 warns about the same trap), so reaching a doctor's phone
 * means doctors.profile_id -> profiles.phone. Getting this wrong sends the
 * doctor's SMS to whichever profile happens to share that uuid — which is why
 * it is done once, here, rather than at each call site.
 *
 * Reads go through the admin client because profiles_select_own hides every
 * phone but your own, and PostgREST applies RLS to embedded selects too.
 */

const NOTIFY_SELECT =
  "id, slot_start, fee_pkr, cancel_reason, " +
  "patient:profiles!patient_id(id, full_name, phone), " +
  "doctor:doctors!doctor_id(full_name, profile:profiles!profile_id(id, phone)), " +
  "clinic:clinics!clinic_id(name)";

// PostgREST types a to-one embed as possibly-an-array; same helper as the
// dashboard pages use.
type Embedded<T> = T | T[] | null;
function one<T>(value: Embedded<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type NotifyRow = {
  id: string;
  slot_start: string;
  fee_pkr: number;
  cancel_reason: string | null;
  patient: Embedded<{ id: string; full_name: string; phone: string | null }>;
  doctor: Embedded<{
    full_name: string;
    profile: Embedded<{ id: string; phone: string | null }>;
  }>;
  clinic: Embedded<{ name: string }>;
};

type Party = { profileId: string; phone: string | null };

export type AppointmentParties = {
  appointmentId: string;
  patient: Party;
  doctor: Party;
  context: AppointmentContext;
};

function toParties(row: NotifyRow): AppointmentParties | null {
  const patient = one(row.patient);
  const doctor = one(row.doctor);
  const doctorProfile = doctor ? one(doctor.profile) : null;
  const clinic = one(row.clinic);

  // A row missing any of these is a broken join, not a missing phone number.
  // Better to skip and say so than to send a message addressed to "undefined".
  if (!patient || !doctor || !doctorProfile || !clinic) return null;

  return {
    appointmentId: row.id,
    patient: { profileId: patient.id, phone: patient.phone },
    doctor: { profileId: doctorProfile.id, phone: doctorProfile.phone },
    context: {
      patientName: patient.full_name,
      doctorName: doctor.full_name,
      clinicName: clinic.name,
      slotStart: row.slot_start,
      feePkr: row.fee_pkr,
      cancelReason: row.cancel_reason,
    },
  };
}

async function loadAppointment(
  appointmentId: string,
): Promise<AppointmentParties | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(NOTIFY_SELECT)
    .eq("id", appointmentId)
    .maybeSingle<NotifyRow>();

  if (error || !data) {
    console.error(
      `[notify] could not load appointment ${appointmentId}:`,
      error?.message ?? "not found",
    );
    return null;
  }
  return toParties(data);
}

async function notifyParty(
  parties: AppointmentParties,
  template: TemplateId,
  party: Party,
): Promise<NotifyOutcome> {
  return send({
    template,
    profileId: party.profileId,
    to: party.phone,
    appointmentId: parties.appointmentId,
    context: parties.context,
  });
}

/**
 * A patient booked. Both sides hear about it immediately — the appointment is
 * `pending` at this point, so the patient's copy promises a second message
 * rather than claiming the doctor has accepted.
 */
export async function notifyBookingRequested(appointmentId: string) {
  const parties = await loadAppointment(appointmentId);
  if (!parties) return;

  await Promise.all([
    notifyParty(parties, "booking_requested_patient", parties.patient),
    notifyParty(parties, "booking_requested_doctor", parties.doctor),
  ]);
}

/**
 * The doctor moved an appointment. Only two transitions are worth an SMS:
 * confirmed and cancelled. `completed` and `no_show` are recorded after the
 * patient has already been (or not been) there.
 */
export async function notifyDoctorStatusChange(
  appointmentId: string,
  status: AppointmentStatus,
) {
  if (status !== "confirmed" && status !== "cancelled") return;

  const parties = await loadAppointment(appointmentId);
  if (!parties) return;

  await notifyParty(
    parties,
    status === "confirmed"
      ? "booking_confirmed_patient"
      : "booking_cancelled_patient",
    parties.patient,
  );
}

/** A patient cancelled: tell the doctor their slot is free again. */
export async function notifyPatientCancelled(appointmentId: string) {
  const parties = await loadAppointment(appointmentId);
  if (!parties) return;

  await notifyParty(parties, "booking_cancelled_doctor", parties.doctor);
}

export type ReminderRun = {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
};

/**
 * The reminder sweep. Both parties are reminded, per the Phase 5 decision.
 *
 * Sends are sequential rather than fanned out: a real provider will rate-limit
 * long before this loop is slow, and the tally is what the cron route reports
 * back. Re-running over an overlapping window is safe — the second pass comes
 * back `skipped` from the notifications_once index rather than sending twice.
 */
export async function sendDueReminders(
  window: ReminderWindow,
): Promise<ReminderRun> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(NOTIFY_SELECT)
    .in("status", ["pending", "confirmed"])
    .gte("slot_start", window.from.toISOString())
    .lt("slot_start", window.to.toISOString())
    .order("slot_start")
    .returns<NotifyRow[]>();

  if (error)
    throw new Error(`Could not read due appointments: ${error.message}`);

  const run: ReminderRun = {
    scanned: data.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const row of data) {
    const parties = toParties(row);
    if (!parties) {
      run.failed += 1;
      continue;
    }

    for (const [template, party] of [
      ["reminder_patient", parties.patient],
      ["reminder_doctor", parties.doctor],
    ] as const) {
      run[await notifyParty(parties, template, party)] += 1;
    }
  }

  return run;
}
