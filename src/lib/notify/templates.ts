/**
 * Message copy, one renderer per template id.
 *
 * Pure — no I/O, no Supabase — so every body is unit-testable and the same
 * renderer serves whichever driver is configured. Callers hand in the
 * appointment facts; formatting happens here so there is one definition of how
 * an appointment reads in a message.
 *
 * English only for now. The renderers take no locale because adding one is
 * additive (i18n.ts already carries an `ur` dictionary), and because Urdu
 * script forces every SMS into UCS-2 — 70 characters a segment instead of 160.
 * That is a cost decision to make against real provider pricing, not a default
 * to drift into.
 *
 * Bodies are sized to fit one GSM-7 segment with representative Pakistani
 * names and clinics; templates.test.ts holds that line.
 */

import { formatAppointmentWhen } from "@/lib/datetime";
import { formatFee } from "@/lib/doctor-display";

import { normalizeForSms } from "./gsm7";
import type { RenderedTemplate, TemplateId, TemplateVariables } from "./types";

export type AppointmentContext = {
  patientName: string;
  /** doctors.full_name — bare, the "Dr." prefix is added here. */
  doctorName: string;
  clinicName: string;
  /** appointments.slot_start, an ISO timestamptz. Rendered in Asia/Karachi. */
  slotStart: string;
  feePkr: number;
  /** appointments.cancel_reason. Truncated for SMS; absent on non-cancellations. */
  cancelReason?: string | null;
};

const SINGLE_SEGMENT_GSM7 = 160;
const REASON_PREFIX = " Reason: ";
/** Below this, a reason is too clipped to mean anything — drop it instead. */
const MIN_REASON_CHARS = 12;

/**
 * Append the cancellation reason to whatever room is left in one SMS segment.
 *
 * cancel_reason allows 200 characters (validators/doctor.ts:64), enough to
 * push a message to a third segment on its own. A fixed truncation limit would
 * have to assume a name and clinic length; budgeting against the finished
 * message instead means an unusually long doctor or clinic name eats into the
 * reason rather than into the bill. The reason goes last precisely so it is
 * the part that can be cut.
 *
 * No reason at all drops the clause entirely, rather than sending "Reason: null".
 */
function withReason(base: string, reason: string | null | undefined): string {
  const trimmed = reason?.trim();
  if (!trimmed) return base;

  const budget =
    SINGLE_SEGMENT_GSM7 - normalizeForSms(base).length - REASON_PREFIX.length;
  if (budget < MIN_REASON_CHARS) return base;

  const text =
    trimmed.length <= budget
      ? trimmed
      : `${trimmed.slice(0, budget - 3).trimEnd()}...`;
  return `${base}${REASON_PREFIX}${text}`;
}

function variablesFor(context: AppointmentContext): TemplateVariables {
  return {
    patientName: context.patientName,
    doctorName: context.doctorName,
    clinic: context.clinicName,
    when: formatAppointmentWhen(context.slotStart),
    fee: formatFee(context.feePkr),
    reason: context.cancelReason?.trim() ?? "",
  };
}

/**
 * Every body goes through normalizeForSms: formatAppointmentWhen joins with an
 * em dash, which is not in GSM-7 and would double the cost of every message.
 */
function rendered(body: string, context: AppointmentContext): RenderedTemplate {
  return { body: normalizeForSms(body), variables: variablesFor(context) };
}

type Renderer = (context: AppointmentContext) => RenderedTemplate;

export const TEMPLATES: Record<TemplateId, Renderer> = {
  // Sent the moment a patient books. The appointment is `pending` here, not
  // confirmed — the copy has to promise a second message rather than imply the
  // doctor has already accepted.
  booking_requested_patient: (context) => {
    const { doctorName, clinic, when, fee } = variablesFor(context);
    return rendered(
      `SehatBook: Booking requested - Dr. ${doctorName}, ${clinic} - ${when}. Fee ${fee}. We'll text you when it is confirmed.`,
      context,
    );
  },

  booking_requested_doctor: (context) => {
    const { patientName, clinic, when, fee } = variablesFor(context);
    return rendered(
      `SehatBook: New booking - ${patientName}, ${when} at ${clinic}. Fee ${fee}. Confirm it in your dashboard.`,
      context,
    );
  },

  booking_confirmed_patient: (context) => {
    const { doctorName, clinic, when, fee } = variablesFor(context);
    return rendered(
      `SehatBook: Confirmed - Dr. ${doctorName}, ${clinic} - ${when}. Fee ${fee}. Please arrive 10 minutes early.`,
      context,
    );
  },

  // No "rebook on SehatBook" tail. It would cost ~20 characters of the reason
  // budget, and a patient whose appointment just vanished needs to know why
  // more than they need a nudge back to a site they are already registered on.
  booking_cancelled_patient: (context) => {
    const { doctorName, when } = variablesFor(context);
    return rendered(
      withReason(
        `SehatBook: Your appointment with Dr. ${doctorName} on ${when} is cancelled.`,
        context.cancelReason,
      ),
      context,
    );
  },

  booking_cancelled_doctor: (context) => {
    const { patientName, clinic, when } = variablesFor(context);
    return rendered(
      withReason(
        `SehatBook: ${patientName} cancelled their ${when} booking at ${clinic}.`,
        context.cancelReason,
      ),
      context,
    );
  },

  // ~3h out. The full date is kept rather than just the time: a slot early in
  // the morning has its reminder fall on the previous calendar day.
  reminder_patient: (context) => {
    const { doctorName, clinic, when, fee } = variablesFor(context);
    return rendered(
      `SehatBook: Reminder - Dr. ${doctorName}, ${clinic} - ${when}. Fee ${fee}. Please arrive 10 minutes early.`,
      context,
    );
  },

  reminder_doctor: (context) => {
    const { patientName, clinic, when } = variablesFor(context);
    return rendered(
      `SehatBook: Reminder - ${patientName}, ${when} at ${clinic}.`,
      context,
    );
  },
};

export function renderTemplate(
  template: TemplateId,
  context: AppointmentContext,
): RenderedTemplate {
  return TEMPLATES[template](context);
}
