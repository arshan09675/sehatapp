/**
 * Which appointments the reminder cron should pick up on this run.
 *
 * Pure, and `now` is a parameter rather than a `new Date()` call inside — the
 * same shape as buildAvailability() in lib/availability.ts, for the same
 * reason: it makes the window assertable against fixed timestamps.
 *
 * The window runs FORWARD from the lead time: [now + lead, now + lead + width).
 * With the default hourly cron that means a patient is warned between 3 and 4
 * hours ahead, never less. Erring early is the right side to err on — the
 * reminder is competing with Lahore traffic.
 *
 * Overlapping windows are harmless. Two runs that both pick up the same
 * appointment produce one message, because notify.ts claims a notifications
 * row before sending and the notifications_once index (0006) rejects the
 * second claim.
 */

export const DEFAULT_LEAD_MINUTES = 180;

/** Should match the cron interval, so consecutive runs tile without a gap. */
export const DEFAULT_WINDOW_MINUTES = 60;

export type ReminderWindow = {
  /** Inclusive. */
  from: Date;
  /** Exclusive, so consecutive runs cannot both claim a boundary slot. */
  to: Date;
};

export function reminderWindow(
  now: Date,
  leadMinutes: number = DEFAULT_LEAD_MINUTES,
  windowMinutes: number = DEFAULT_WINDOW_MINUTES,
): ReminderWindow {
  const from = new Date(now.getTime() + leadMinutes * 60_000);
  return { from, to: new Date(from.getTime() + windowMinutes * 60_000) };
}

/**
 * Read a minutes value from the environment, falling back when it is missing
 * or nonsense. A typo in REMINDER_LEAD_MINUTES should not silently make the
 * window NaN — which would match no appointments at all, and look exactly like
 * "there was nothing due".
 */
export function minutesFromEnv(raw: string | undefined, fallback: number) {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}
