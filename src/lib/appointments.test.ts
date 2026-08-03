import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_STATUSES,
  canTransition,
  DOCTOR_ACTIONS,
  isTerminal,
  statusesAllowing,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  type AppointmentStatus,
} from "./appointments";

const TERMINAL: AppointmentStatus[] = ["completed", "cancelled", "no_show"];

describe("doctor status transitions", () => {
  it("covers every status in the database enum", () => {
    expect([...APPOINTMENT_STATUSES].sort()).toEqual(
      ["cancelled", "completed", "confirmed", "no_show", "pending"].sort(),
    );
  });

  it("allows confirm and cancel from pending", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
  });

  it("blocks skipping confirmation", () => {
    expect(canTransition("pending", "completed")).toBe(false);
    expect(canTransition("pending", "no_show")).toBe(false);
  });

  it("allows complete, no-show, and cancel from confirmed", () => {
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
  });

  it("never moves backwards to pending", () => {
    for (const from of APPOINTMENT_STATUSES) {
      expect(canTransition(from, "pending")).toBe(false);
    }
  });

  // The BUILD_PLAN acceptance criterion: "cannot complete a cancelled
  // appointment". Asserted for every terminal state against every target.
  it.each(TERMINAL)("treats %s as terminal", (from) => {
    expect(isTerminal(from)).toBe(true);
    for (const to of APPOINTMENT_STATUSES) {
      expect(canTransition(from, to)).toBe(false);
    }
  });

  it("does not treat pending or confirmed as terminal", () => {
    expect(isTerminal("pending")).toBe(false);
    expect(isTerminal("confirmed")).toBe(false);
  });

  it("never allows a no-op transition to the same status", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe("statusesAllowing", () => {
  // This drives the .in("status", …) guard on the UPDATE, so it has to be the
  // exact inverse of the transition map.
  it("inverts the transition map", () => {
    expect([...statusesAllowing("confirmed")]).toEqual(["pending"]);
    expect([...statusesAllowing("completed")]).toEqual(["confirmed"]);
    expect([...statusesAllowing("no_show")]).toEqual(["confirmed"]);
    expect([...statusesAllowing("cancelled")].sort()).toEqual([
      "confirmed",
      "pending",
    ]);
  });

  it("returns nothing for a status a doctor can never set", () => {
    expect(statusesAllowing("pending")).toHaveLength(0);
  });

  it("agrees with canTransition for every pair", () => {
    for (const to of APPOINTMENT_STATUSES) {
      const allowed = statusesAllowing(to);
      for (const from of APPOINTMENT_STATUSES) {
        expect(allowed.includes(from)).toBe(canTransition(from, to));
      }
    }
  });
});

describe("presentation maps", () => {
  it("labels and styles every status", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(STATUS_LABEL[status]).toBeTruthy();
      expect(STATUS_BADGE_CLASS[status]).toBeTruthy();
    }
    expect(STATUS_LABEL.no_show).toBe("No-show");
  });

  it("offers a button for exactly the legal transitions", () => {
    for (const status of APPOINTMENT_STATUSES) {
      const offered = DOCTOR_ACTIONS[status].map((action) => action.status);
      for (const target of offered) {
        expect(canTransition(status, target)).toBe(true);
      }
      expect(offered).toHaveLength(
        APPOINTMENT_STATUSES.filter((to) => canTransition(status, to)).length,
      );
    }
  });

  it("shows no actions on terminal rows", () => {
    for (const status of TERMINAL) {
      expect(DOCTOR_ACTIONS[status]).toHaveLength(0);
    }
  });
});
