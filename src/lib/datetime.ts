/**
 * Asia/Karachi date/time formatting and range math.
 *
 * Appointment timestamps are stored UTC (timestamptz) and displayed in
 * Asia/Karachi, matching book_appointment, which does all of its schedule
 * lookups in that zone.
 *
 * Day boundaries are built from a literal +05:00 offset: PKT has been a fixed
 * UTC+05:00 with no DST since the 2008-09 experiment ended. If Pakistan ever
 * reintroduces DST, every `${key}T…${KARACHI_UTC_OFFSET}` below is a bug.
 */

export const KARACHI_TZ = "Asia/Karachi";
const KARACHI_UTC_OFFSET = "+05:00";

// en-GB for day-before-month ordering, en-US for "PM" rather than "pm".
// Both are pinned deliberately: the exact strings are part of the design.
const dateFmt = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeZone: KARACHI_TZ,
});
const clockFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: KARACHI_TZ,
});
const weekdayShortFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: KARACHI_TZ,
});
const weekdayLongFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  timeZone: KARACHI_TZ,
});
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: KARACHI_TZ,
});
const dayMonthYearFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: KARACHI_TZ,
});
// en-CA yields ISO-shaped "2026-08-03", which is also the `date` column format.
const dateKeyFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: KARACHI_TZ,
});
const timeKeyFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: KARACHI_TZ,
});

/** Medium date, e.g. "3 Aug 2026". */
export function formatDate(value: string | Date): string {
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

/** Slot time, e.g. "3:00 PM". */
export function formatSlotTime(value: string | Date): string {
  return clockFmt.format(typeof value === "string" ? new Date(value) : value);
}

/** A date-only key ("2026-08-14") as a Date at Karachi midday — safely inside
 *  the day whichever way it is later formatted. */
function fromDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00${KARACHI_UTC_OFFSET}`);
}

/** "2026-08-14" → "Thu, 14 Aug", the leave-panel format. */
export function formatLeaveDate(dateKey: string): string {
  const date = fromDateKey(dateKey);
  return `${weekdayShortFmt.format(date)}, ${dayMonthFmt.format(date)}`;
}

/** "Monday, 3 August 2026", the dashboard greeting sub-line. */
export function formatGreetingDate(date: Date = new Date()): string {
  return `${weekdayLongFmt.format(date)}, ${dayMonthYearFmt.format(date)}`;
}

/** The Karachi calendar date of an instant, as "YYYY-MM-DD". */
export function karachiDateKey(date: Date = new Date()): string {
  return dateKeyFmt.format(date);
}

/** The Karachi wall-clock time of an instant, as "HH:MM" (24h). */
export function karachiTimeKey(date: Date = new Date()): string {
  return timeKeyFmt.format(date);
}

/** Postgres extract(dow) for a date key: 0 = Sunday. */
export function karachiDayOfWeek(dateKey: string): number {
  return fromDateKey(dateKey).getUTCDay();
}

/** Shift a date key by whole days, staying in the Karachi calendar. */
export function addDays(dateKey: string, days: number): string {
  const date = fromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKeyFmt.format(date);
}

/** Midnight Karachi on the given date key, as a UTC instant. */
export function karachiDayStart(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00${KARACHI_UTC_OFFSET}`);
}

/** Half-open [start, end) covering one Karachi day, for .gte()/.lt() filters. */
export function karachiDayBounds(dateKey: string): { start: Date; end: Date } {
  return {
    start: karachiDayStart(dateKey),
    end: karachiDayStart(addDays(dateKey, 1)),
  };
}

/** Half-open [Monday, next Monday) around the given instant. */
export function karachiWeekBounds(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const todayKey = karachiDateKey(now);
  const daysSinceMonday = (karachiDayOfWeek(todayKey) + 6) % 7;
  const mondayKey = addDays(todayKey, -daysSinceMonday);
  return {
    start: karachiDayStart(mondayKey),
    end: karachiDayStart(addDays(mondayKey, 7)),
  };
}

/** Time-of-day greeting in Karachi, e.g. "Good afternoon". */
export function karachiGreeting(now: Date = new Date()): string {
  const hour = Number(karachiTimeKey(now).slice(0, 2));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
