import "server-only";

/**
 * Notifications — the only module call sites import.
 *
 * Everything behind it (drivers, templates, the send pipeline, the reminder
 * sweep) lives in lib/notify/, the same shape as lib/auth/ and lib/supabase/.
 * The point of the indirection is the Phase 5 requirement that a real SMS
 * provider and a WhatsApp Cloud API driver can each be added later without
 * touching a single call site: a driver is one file in notify/drivers/ plus one
 * line in the DRIVERS map in notify/send.ts, and nothing above this line
 * changes. See docs/NOTIFICATIONS.md.
 *
 * Every function here is safe to call from inside `after()` — none of them
 * throw, and a failed send is recorded in the notifications table rather than
 * surfaced to the user. A booking must never fail because an SMS did.
 */

export {
  notifyBookingRequested,
  notifyDoctorStatusChange,
  notifyPatientCancelled,
  sendDueReminders,
  type AppointmentParties,
  type ReminderRun,
} from "./notify/appointments";

export {
  DEFAULT_LEAD_MINUTES,
  DEFAULT_WINDOW_MINUTES,
  minutesFromEnv,
  reminderWindow,
  type ReminderWindow,
} from "./notify/due";

export { send, type SendRequest } from "./notify/send";

export type { AppointmentContext } from "./notify/templates";

export type {
  NotificationChannel,
  NotificationDriver,
  NotificationMessage,
  NotifyOutcome,
  SendResult,
  TemplateId,
} from "./notify/types";
