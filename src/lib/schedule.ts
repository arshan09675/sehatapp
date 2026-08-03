/**
 * Pure schedule/slot helpers, shared by the server action that writes
 * `schedules` rows and the client form that shows the live
 * "15-min · 12 slots" read-out. No server-only imports — this runs on both
 * sides of the boundary.
 *
 * Times here are wall-clock strings ("HH:MM"), matching the `time` columns on
 * schedules/schedule_exceptions. book_appointment interprets them in
 * Asia/Karachi; nothing in this module touches timezones.
 */

/** Weekday values match Postgres extract(dow): 0 = Sunday. Listed Mon → Sun. */
export const WEEKDAYS = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
] as const;

/**
 * Mirrors the schedules.slot_minutes CHECK constraint. Sending anything else
 * fails the insert with Postgres 23514.
 */
export const SLOT_MINUTES_OPTIONS = [10, 15, 20, 30, 45, 60] as const;

export const DEFAULT_SLOT_MINUTES = 15;
export const DEFAULT_START_TIME = "09:00";
export const DEFAULT_END_TIME = "13:00";

/** One weekday's hours, as stored in `schedules`. */
export type DaySchedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

/** Accepts "15:00" and the "15:00:00" Postgres returns. NaN if unparseable. */
export function toMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

/** 900 → "15:00", the shape the `time` columns accept. */
export function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * "15:00" → "3:00 PM". Deliberately not Intl.DateTimeFormat: these are
 * date-less wall-clock strings, and pushing them through a timezone-aware
 * formatter is how you get off-by-hours bugs.
 */
export function formatTime12h(time: string): string {
  const total = toMinutes(time);
  if (Number.isNaN(total)) return time;
  const hours = Math.floor(total / 60);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(total % 60).padStart(2, "0")} ${period}`;
}

/**
 * How many bookable slots a day yields. Mirrors book_appointment: the grid is
 * anchored at start_time and stepped by slot_minutes, and the range is
 * half-open, so a slot starting exactly at end_time does not count.
 */
export function countSlots(
  start: string,
  end: string,
  slotMinutes: number,
): number {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (Number.isNaN(from) || Number.isNaN(to) || slotMinutes <= 0) return 0;
  return Math.max(0, Math.floor((to - from) / slotMinutes));
}

/** "15-min" — the duration half of the read-out, and the dropdown's labels. */
export function slotDurationLabel(slotMinutes: number): string {
  return `${slotMinutes}-min`;
}

/** "12 slots" / "1 slot" — the count half of the read-out. */
export function slotCountLabel(count: number): string {
  return count === 1 ? "1 slot" : `${count} slots`;
}

/**
 * The reference's full read-out, e.g. "15-min · 12 slots".
 * The separator is U+00B7 MIDDLE DOT.
 */
export function slotHint(
  start: string,
  end: string,
  slotMinutes: number,
): string {
  const count = countSlots(start, end, slotMinutes);
  if (count === 0) return "End time must be after start time";
  return `${slotDurationLabel(slotMinutes)} · ${slotCountLabel(count)}`;
}

/**
 * Start/end dropdown options on a 15-minute grid, 6:00 AM → 11:00 PM.
 * Grid granularity is independent of slot duration: book_appointment anchors
 * its slot grid at start_time, so a 10-minute slot starting at 09:00 is fine.
 */
export const TIME_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  Array.from({ length: (23 - 6) * 4 + 1 }, (_, i) => {
    const value = toTimeString(6 * 60 + i * 15);
    return { value, label: formatTime12h(value) };
  });

/**
 * Whether a wall-clock time on a weekday lands on a bookable slot. Mirrors
 * book_appointment's validation exactly — half-open range plus the modulo
 * grid check anchored at start_time — so the dashboard and the booking RPC
 * agree on what "inside my hours" means.
 */
export function isSlotWithinSchedule(
  week: readonly DaySchedule[],
  dayOfWeek: number,
  time: string,
): boolean {
  const minutes = toMinutes(time);
  if (Number.isNaN(minutes)) return false;

  return week.some((day) => {
    if (day.dayOfWeek !== dayOfWeek) return false;
    const from = toMinutes(day.startTime);
    const to = toMinutes(day.endTime);
    if (Number.isNaN(from) || Number.isNaN(to) || day.slotMinutes <= 0) {
      return false;
    }
    return (
      minutes >= from &&
      minutes < to &&
      (minutes - from) % day.slotMinutes === 0
    );
  });
}
