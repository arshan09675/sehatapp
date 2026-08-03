/**
 * Appointment status rules for the doctor dashboard.
 *
 * IMPORTANT: DOCTOR_TRANSITIONS is mirrored by the appointments_status_guard
 * trigger in supabase/migrations/0003_doctor_dashboard.sql. The trigger is the
 * real enforcement point (appt_doctor_update has no `with check`, so PostgREST
 * is reachable directly); this map exists so the UI can hide impossible
 * actions and the server action can fail with a useful message. Change one and
 * you must change the other.
 */

import { Constants } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";

export type AppointmentStatus =
  Database["public"]["Enums"]["appointment_status"];

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] =
  Constants.public.Enums.appointment_status;

/** What a doctor may move an appointment to, from each status. */
export const DOCTOR_TRANSITIONS: Record<
  AppointmentStatus,
  readonly AppointmentStatus[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return DOCTOR_TRANSITIONS[from].includes(to);
}

/** Nothing can move out of these. */
export function isTerminal(status: AppointmentStatus): boolean {
  return DOCTOR_TRANSITIONS[status].length === 0;
}

/**
 * Every status a doctor may move *to* the given one — used as the
 * `.in("status", …)` guard so the transition check and the write are a single
 * atomic statement rather than a read-then-write race.
 */
export function statusesAllowing(
  to: AppointmentStatus,
): readonly AppointmentStatus[] {
  return APPOINTMENT_STATUSES.filter((from) => canTransition(from, to));
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

/** Badge styling per the #fordoc reference. `#92500A` and `#EEF0F4` have no
 *  design token — they appear only here. */
export const STATUS_BADGE_CLASS: Record<AppointmentStatus, string> = {
  pending: "bg-amber-soft text-[#92500A]",
  confirmed: "bg-brand-soft text-brand-strong",
  completed: "bg-success-soft text-success",
  cancelled: "bg-danger-soft text-danger",
  no_show: "bg-[#EEF0F4] text-ink-muted",
};

export type AppointmentAction = {
  status: AppointmentStatus;
  label: string;
  /** "primary" = filled brand button, "quiet" = grey ghost. */
  tone: "primary" | "quiet";
};

/**
 * Buttons shown on a row, in order. The reference shows two per row; cancel
 * from `confirmed` is the third (a doctor needs an escape hatch for
 * emergencies) and wraps onto the next line when space runs out.
 */
export const DOCTOR_ACTIONS: Record<AppointmentStatus, AppointmentAction[]> = {
  pending: [
    { status: "confirmed", label: "Confirm", tone: "primary" },
    { status: "cancelled", label: "Cancel", tone: "quiet" },
  ],
  confirmed: [
    { status: "completed", label: "Complete", tone: "primary" },
    { status: "no_show", label: "No-show", tone: "quiet" },
    { status: "cancelled", label: "Cancel", tone: "quiet" },
  ],
  completed: [],
  cancelled: [],
  no_show: [],
};
