import { describe, expect, it } from "vitest";

import { buildAvailability, firstOpenSlot, hasOpenSlot } from "./availability";

// Monday 3 August 2026 in Asia/Karachi (UTC+05:00, no DST).
const MONDAY = "2026-08-03";
const MONDAY_DOW = 1;

/** Monday 3–6 PM, 15-minute slots: 12 slots, 3:00 PM through 5:45 PM. */
const MONDAY_AFTERNOON = [
  {
    dayOfWeek: MONDAY_DOW,
    startTime: "15:00",
    endTime: "18:00",
    slotMinutes: 15,
  },
];

/** A Karachi wall-clock time on the reference Monday, as a UTC instant. */
function monday(time: string): Date {
  return new Date(`${MONDAY}T${time}:00+05:00`);
}

const BEFORE_CLINIC = monday("08:00");

function build(
  overrides: Partial<Parameters<typeof buildAvailability>[0]> = {},
) {
  return buildAvailability({
    schedules: MONDAY_AFTERNOON,
    closedDates: new Set<string>(),
    takenAt: new Set<number>(),
    startDateKey: MONDAY,
    dayCount: 3,
    now: BEFORE_CLINIC,
    ...overrides,
  });
}

describe("buildAvailability", () => {
  it("generates the weekday's slots and nothing on unscheduled days", () => {
    const days = build();

    expect(days).toHaveLength(3);
    expect(days[0].dateKey).toBe(MONDAY);
    expect(days[0].dayOfWeek).toBe(MONDAY_DOW);
    expect(days[0].slots).toHaveLength(12);
    // Tuesday and Wednesday have no schedules row.
    expect(days[1].slots).toHaveLength(0);
    expect(days[2].slots).toHaveLength(0);
  });

  it("walks the calendar forward across the range", () => {
    const days = build();
    expect(days.map((day) => day.dateKey)).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
    ]);
  });

  it("places slots at the right Karachi wall-clock times", () => {
    const [first] = build()[0].slots;
    expect(first.label).toBe("3:00 PM");
    expect(first.startsAt.toISOString()).toBe("2026-08-03T10:00:00.000Z");
    expect(build()[0].slots.at(-1)?.label).toBe("5:45 PM");
  });

  it("closes a whole day on a leave exception", () => {
    const days = build({ closedDates: new Set([MONDAY]) });
    expect(days[0].closed).toBe(true);
    expect(days[0].slots).toEqual([]);
    expect(hasOpenSlot(days[0])).toBe(false);
  });

  it("marks booked slots taken and leaves the rest alone", () => {
    const days = build({ takenAt: new Set([monday("15:30").getTime()]) });
    const taken = days[0].slots.filter((slot) => slot.taken);

    expect(taken).toHaveLength(1);
    expect(taken[0].label).toBe("3:30 PM");
    // Taken slots stay in the grid — the design greys them rather than
    // hiding them, so a busy day still reads as a busy day.
    expect(days[0].slots).toHaveLength(12);
  });

  it("marks slots at or before now as past", () => {
    const days = build({ now: monday("15:30") });
    const past = days[0].slots.filter((slot) => slot.past);

    // 3:00, 3:15 and 3:30 are gone — book_appointment rejects
    // slot_start <= now(), so the slot starting exactly now counts as past.
    expect(past.map((slot) => slot.label)).toEqual([
      "3:00 PM",
      "3:15 PM",
      "3:30 PM",
    ]);
  });

  it("returns empty days rather than throwing on an unusable schedule", () => {
    const days = build({
      schedules: [
        {
          dayOfWeek: MONDAY_DOW,
          startTime: "18:00",
          endTime: "15:00",
          slotMinutes: 15,
        },
      ],
    });
    expect(days[0].slots).toEqual([]);
  });
});

describe("firstOpenSlot", () => {
  it("finds the earliest slot that is neither taken nor past", () => {
    const days = build({
      now: monday("15:20"),
      takenAt: new Set([monday("15:30").getTime()]),
    });

    const opening = firstOpenSlot(days);
    // 3:00 and 3:15 are past, 3:30 is booked.
    expect(opening?.slot.label).toBe("3:45 PM");
    expect(opening?.day.dateKey).toBe(MONDAY);
  });

  it("skips a fully booked day and moves to the next open one", () => {
    const wednesday = {
      dayOfWeek: 3,
      startTime: "10:00",
      endTime: "11:00",
      slotMinutes: 30,
    };
    const allMondaySlots = build()[0].slots.map((slot) =>
      slot.startsAt.getTime(),
    );

    const days = build({
      schedules: [...MONDAY_AFTERNOON, wednesday],
      takenAt: new Set(allMondaySlots),
    });

    const opening = firstOpenSlot(days);
    expect(opening?.day.dateKey).toBe("2026-08-05");
    expect(opening?.slot.label).toBe("10:00 AM");
  });

  it("returns null when nothing is bookable", () => {
    expect(firstOpenSlot(build({ closedDates: new Set([MONDAY]) }))).toBeNull();
    expect(firstOpenSlot([])).toBeNull();
  });
});
