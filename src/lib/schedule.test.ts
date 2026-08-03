import { describe, expect, it } from "vitest";

import {
  countSlots,
  formatTime12h,
  generateDaySlots,
  isSlotWithinSchedule,
  SLOT_MINUTES_OPTIONS,
  slotHint,
  TIME_OPTIONS,
  toMinutes,
  toTimeString,
} from "./schedule";

describe("countSlots", () => {
  // The five rows in the #fordoc reference, which the design's slot counts
  // were drawn from. If these drift, the dashboard is lying to the doctor.
  it.each([
    ["15:00", "18:00", 15, 12],
    ["12:00", "16:30", 15, 18],
    ["12:00", "14:00", 15, 8],
    ["15:00", "18:00", 15, 12],
    ["15:00", "17:00", 15, 8],
  ])("%s–%s at %i min yields %i slots", (start, end, minutes, expected) => {
    expect(countSlots(start, end, minutes)).toBe(expected);
  });

  it("returns 0 when the range is empty or inverted", () => {
    expect(countSlots("15:00", "15:00", 15)).toBe(0);
    expect(countSlots("18:00", "15:00", 15)).toBe(0);
  });

  it("returns 0 when the range is shorter than one slot", () => {
    expect(countSlots("09:00", "09:10", 15)).toBe(0);
  });

  it("floors a range that does not divide evenly", () => {
    // 50 minutes of room, 15-minute slots: the trailing 5 minutes are unusable.
    expect(countSlots("09:00", "09:50", 15)).toBe(3);
  });

  it("handles every duration the CHECK constraint allows", () => {
    expect(countSlots("09:00", "10:00", 10)).toBe(6);
    expect(countSlots("09:00", "10:00", 15)).toBe(4);
    expect(countSlots("09:00", "10:00", 20)).toBe(3);
    expect(countSlots("09:00", "10:00", 30)).toBe(2);
    expect(countSlots("09:00", "10:00", 45)).toBe(1);
    expect(countSlots("09:00", "10:00", 60)).toBe(1);
  });

  it("accepts the HH:MM:SS that Postgres returns for `time`", () => {
    expect(countSlots("15:00:00", "18:00:00", 15)).toBe(12);
  });

  it("returns 0 rather than NaN for unparseable input", () => {
    expect(countSlots("", "18:00", 15)).toBe(0);
    expect(countSlots("25:00", "26:00", 15)).toBe(0);
    expect(countSlots("09:00", "10:00", 0)).toBe(0);
  });
});

describe("slotHint", () => {
  it("matches the reference read-out byte for byte", () => {
    // U+00B7 MIDDLE DOT, spaced, with a hyphenated duration.
    expect(slotHint("15:00", "18:00", 15)).toBe("15-min · 12 slots");
    expect(slotHint("12:00", "16:30", 15)).toBe("15-min · 18 slots");
  });

  it("uses the singular for exactly one slot", () => {
    expect(slotHint("09:00", "09:15", 15)).toBe("15-min · 1 slot");
  });

  it("explains an unusable range instead of showing 0 slots", () => {
    expect(slotHint("18:00", "15:00", 15)).toBe(
      "End time must be after start time",
    );
  });
});

describe("time conversion", () => {
  it("round-trips through minutes", () => {
    expect(toMinutes("15:00")).toBe(900);
    expect(toMinutes("15:00:00")).toBe(900);
    expect(toMinutes("00:00")).toBe(0);
    expect(toTimeString(900)).toBe("15:00");
    expect(toTimeString(0)).toBe("00:00");
    expect(toTimeString(toMinutes("09:45"))).toBe("09:45");
  });

  it("rejects out-of-range clock values", () => {
    expect(toMinutes("24:00")).toBeNaN();
    expect(toMinutes("12:60")).toBeNaN();
    expect(toMinutes("nonsense")).toBeNaN();
  });

  it("formats 12-hour times the way the design shows them", () => {
    expect(formatTime12h("15:00")).toBe("3:00 PM");
    expect(formatTime12h("00:00")).toBe("12:00 AM");
    expect(formatTime12h("12:00")).toBe("12:00 PM");
    expect(formatTime12h("09:05")).toBe("9:05 AM");
    expect(formatTime12h("23:45")).toBe("11:45 PM");
  });
});

describe("TIME_OPTIONS", () => {
  it("covers 6:00 AM to 11:00 PM on a 15-minute grid", () => {
    expect(TIME_OPTIONS[0]).toEqual({ value: "06:00", label: "6:00 AM" });
    expect(TIME_OPTIONS.at(-1)).toEqual({ value: "23:00", label: "11:00 PM" });
    expect(TIME_OPTIONS).toHaveLength(69);
  });
});

describe("generateDaySlots", () => {
  const RANGES: ReadonlyArray<[string, string]> = [
    ["09:00", "13:00"],
    ["15:00", "18:00"],
    ["12:00", "16:30"],
    ["09:00", "09:50"],
    ["08:00", "20:00"],
    ["23:00", "23:30"],
  ];

  it("starts at the start time and stops before the end time", () => {
    const slots = generateDaySlots({
      dayOfWeek: 1,
      startTime: "15:00",
      endTime: "18:00",
      slotMinutes: 15,
    });
    expect(slots[0]).toBe("15:00");
    expect(slots.at(-1)).toBe("17:45");
    expect(slots).not.toContain("18:00");
  });

  // The two guarantees that keep the public picker, the doctor dashboard, and
  // book_appointment from drifting apart. If someone reimplements slot
  // generation anywhere, one of these breaks.
  it("agrees with countSlots for every legal duration", () => {
    for (const [startTime, endTime] of RANGES) {
      for (const slotMinutes of SLOT_MINUTES_OPTIONS) {
        expect(
          generateDaySlots({ dayOfWeek: 1, startTime, endTime, slotMinutes }),
        ).toHaveLength(countSlots(startTime, endTime, slotMinutes));
      }
    }
  });

  it("only ever produces times isSlotWithinSchedule accepts", () => {
    for (const [startTime, endTime] of RANGES) {
      for (const slotMinutes of SLOT_MINUTES_OPTIONS) {
        const day = { dayOfWeek: 3, startTime, endTime, slotMinutes };
        for (const slot of generateDaySlots(day)) {
          expect(isSlotWithinSchedule([day], 3, slot)).toBe(true);
        }
      }
    }
  });

  it("never offers a slot that would overrun closing time", () => {
    // book_appointment would accept 12:45 here — it only checks that the
    // start is aligned and before end_time. We deliberately do not offer it.
    const day = {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "13:00",
      slotMinutes: 45,
    };
    expect(generateDaySlots(day)).toEqual([
      "09:00",
      "09:45",
      "10:30",
      "11:15",
      "12:00",
    ]);
    expect(isSlotWithinSchedule([day], 1, "12:45")).toBe(true);
  });

  it("returns nothing for an unusable range", () => {
    const base = { dayOfWeek: 1, slotMinutes: 15 };
    expect(
      generateDaySlots({ ...base, startTime: "18:00", endTime: "15:00" }),
    ).toEqual([]);
    expect(
      generateDaySlots({ ...base, startTime: "15:00", endTime: "15:00" }),
    ).toEqual([]);
    expect(
      generateDaySlots({ ...base, startTime: "oops", endTime: "15:00" }),
    ).toEqual([]);
  });
});

describe("isSlotWithinSchedule", () => {
  // Monday 3:00–6:00 PM, 15-minute slots.
  const week = [
    { dayOfWeek: 1, startTime: "15:00", endTime: "18:00", slotMinutes: 15 },
  ];

  it("accepts a time on the grid", () => {
    expect(isSlotWithinSchedule(week, 1, "15:00")).toBe(true);
    expect(isSlotWithinSchedule(week, 1, "17:45")).toBe(true);
  });

  it("rejects a time off the grid", () => {
    expect(isSlotWithinSchedule(week, 1, "15:07")).toBe(false);
  });

  it("treats the range as half-open, matching book_appointment", () => {
    expect(isSlotWithinSchedule(week, 1, "18:00")).toBe(false);
    expect(isSlotWithinSchedule(week, 1, "14:45")).toBe(false);
  });

  it("rejects a day that is closed", () => {
    expect(isSlotWithinSchedule(week, 2, "15:00")).toBe(false);
    expect(isSlotWithinSchedule([], 1, "15:00")).toBe(false);
  });
});
