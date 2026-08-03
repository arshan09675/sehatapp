/**
 * Turns a doctor's stored schedule into the day-by-day slot grid the public
 * picker renders.
 *
 * Pure — no I/O and no Supabase, so it is unit-testable and can run on either
 * side of the boundary. Callers fetch the schedules, the closed dates, and the
 * taken times, then hand them here. Slot times come from
 * schedule.ts's generateDaySlots(), which shares its grid rule with
 * isSlotWithinSchedule() and therefore with book_appointment — there is no
 * second definition of "bookable" anywhere.
 */

import {
  addDays,
  formatSlotTime,
  karachiDayOfWeek,
  karachiDayStart,
} from "@/lib/datetime";
import { generateDaySlots, toMinutes, type DaySchedule } from "@/lib/schedule";

export type AvailabilitySlot = {
  /** The UTC instant the slot begins — what book_appointment takes. */
  startsAt: Date;
  /** "3:00 PM", already in Asia/Karachi. */
  label: string;
  taken: boolean;
  past: boolean;
};

export type AvailabilityDay = {
  /** "2026-08-04", the Karachi calendar date. */
  dateKey: string;
  /** Postgres extract(dow): 0 = Sunday. */
  dayOfWeek: number;
  /** A schedule_exception closes the whole day. */
  closed: boolean;
  slots: AvailabilitySlot[];
};

export type BuildAvailabilityInput = {
  schedules: readonly DaySchedule[];
  /** Dates blocked by a closed schedule_exception, as "YYYY-MM-DD". */
  closedDates: ReadonlySet<string>;
  /** Already-booked slot starts, as epoch milliseconds. */
  takenAt: ReadonlySet<number>;
  startDateKey: string;
  dayCount: number;
  now: Date;
};

export function buildAvailability({
  schedules,
  closedDates,
  takenAt,
  startDateKey,
  dayCount,
  now,
}: BuildAvailabilityInput): AvailabilityDay[] {
  const nowMs = now.getTime();
  const days: AvailabilityDay[] = [];

  for (let offset = 0; offset < dayCount; offset += 1) {
    const dateKey = addDays(startDateKey, offset);
    const dayOfWeek = karachiDayOfWeek(dateKey);
    const closed = closedDates.has(dateKey);
    const slots: AvailabilitySlot[] = [];

    if (!closed) {
      // Karachi is a fixed UTC+05:00 with no DST, so adding wall-clock
      // minutes to local midnight as real elapsed time is exact — there is
      // no spring-forward gap or autumn fold to fall into.
      const midnight = karachiDayStart(dateKey).getTime();

      for (const schedule of schedules) {
        if (schedule.dayOfWeek !== dayOfWeek) continue;

        for (const time of generateDaySlots(schedule)) {
          const startsAt = new Date(midnight + toMinutes(time) * 60_000);
          const startedAt = startsAt.getTime();
          slots.push({
            startsAt,
            label: formatSlotTime(startsAt),
            taken: takenAt.has(startedAt),
            // book_appointment rejects `p_slot_start <= now()`, so a slot
            // starting exactly now is already gone.
            past: startedAt <= nowMs,
          });
        }
      }

      slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    }

    days.push({ dateKey, dayOfWeek, closed, slots });
  }

  return days;
}

/** Whether a day still has something a patient could book. */
export function hasOpenSlot(day: AvailabilityDay): boolean {
  return day.slots.some((slot) => !slot.taken && !slot.past);
}

/**
 * The earliest slot a patient could actually take, across the whole range —
 * what drives the "Available today" chip and the "Tomorrow 10:00 AM" pill on
 * search results.
 */
export function firstOpenSlot(
  days: readonly AvailabilityDay[],
): { day: AvailabilityDay; slot: AvailabilitySlot } | null {
  for (const day of days) {
    for (const slot of day.slots) {
      if (!slot.taken && !slot.past) return { day, slot };
    }
  }
  return null;
}
