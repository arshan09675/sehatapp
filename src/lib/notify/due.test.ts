import { describe, expect, it } from "vitest";

import {
  DEFAULT_LEAD_MINUTES,
  DEFAULT_WINDOW_MINUTES,
  minutesFromEnv,
  reminderWindow,
} from "./due";

// Wednesday 12 August 2026 in Asia/Karachi (UTC+05:00, no DST).
function karachi(time: string): Date {
  return new Date(`2026-08-12T${time}:00+05:00`);
}

describe("reminderWindow", () => {
  it("opens at the lead time and is one interval wide", () => {
    const { from, to } = reminderWindow(karachi("09:00"));
    expect(from.toISOString()).toBe(karachi("12:00").toISOString());
    expect(to.toISOString()).toBe(karachi("13:00").toISOString());
  });

  it("defaults to three hours ahead, one hour wide", () => {
    expect(DEFAULT_LEAD_MINUTES).toBe(180);
    expect(DEFAULT_WINDOW_MINUTES).toBe(60);
  });

  // The direction matters. A forward window means notice always lands between
  // the lead time and one interval more — never less. A patient warned two
  // hours before an appointment across Lahore is a patient who misses it.
  it("never gives less notice than the lead time", () => {
    const now = karachi("09:00");
    const { from, to } = reminderWindow(now);
    for (const slot of [from, new Date(to.getTime() - 1)]) {
      const noticeMinutes = (slot.getTime() - now.getTime()) / 60_000;
      expect(noticeMinutes).toBeGreaterThanOrEqual(DEFAULT_LEAD_MINUTES);
      expect(noticeMinutes).toBeLessThan(
        DEFAULT_LEAD_MINUTES + DEFAULT_WINDOW_MINUTES,
      );
    }
  });

  // Consecutive hourly runs must tile exactly: a gap silently drops every
  // appointment that falls in it, and `to` being exclusive stops a boundary
  // slot being claimed by both runs.
  it("tiles with the next run without a gap or an overlap", () => {
    const first = reminderWindow(karachi("09:00"));
    const second = reminderWindow(karachi("10:00"));
    expect(second.from.toISOString()).toBe(first.to.toISOString());
  });

  it("honours a custom lead and width", () => {
    const { from, to } = reminderWindow(karachi("09:00"), 30, 15);
    expect(from.toISOString()).toBe(karachi("09:30").toISOString());
    expect(to.toISOString()).toBe(karachi("09:45").toISOString());
  });

  it("does not mutate the caller's date", () => {
    const now = karachi("09:00");
    reminderWindow(now);
    expect(now.toISOString()).toBe(karachi("09:00").toISOString());
  });
});

describe("minutesFromEnv", () => {
  it("takes a valid value", () => {
    expect(minutesFromEnv("90", 180)).toBe(90);
  });

  it("falls back when unset or blank", () => {
    expect(minutesFromEnv(undefined, 180)).toBe(180);
    expect(minutesFromEnv("   ", 180)).toBe(180);
  });

  // A typo must not produce NaN: NaN in the window matches no appointments at
  // all, which looks exactly like a quiet hour with nothing due.
  it("falls back on values that would poison the window", () => {
    expect(minutesFromEnv("three hours", 180)).toBe(180);
    expect(minutesFromEnv("0", 180)).toBe(180);
    expect(minutesFromEnv("-60", 180)).toBe(180);
    expect(minutesFromEnv("Infinity", 180)).toBe(180);
  });

  it("floors fractional minutes", () => {
    expect(minutesFromEnv("90.7", 180)).toBe(90);
  });
});
