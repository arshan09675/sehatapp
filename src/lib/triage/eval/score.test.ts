import { describe, expect, it } from "vitest";

import { formatTable, percent, scoreResults, type CaseResult } from "./score";

function result(
  id: string,
  labelled: [specialty: string, urgency: string],
  predicted?: [specialty: string, urgency: string, driverUrgency?: string],
): CaseResult {
  const base = {
    case: {
      id,
      lang: "en" as const,
      text: `case ${id}`,
      specialty: labelled[0] as never,
      urgency: labelled[1] as never,
    },
  };

  if (!predicted) return { ...base, error: "unavailable: no model" };

  return {
    ...base,
    prediction: {
      specialty: predicted[0] as never,
      urgency: predicted[1] as never,
      driverUrgency: (predicted[2] ?? predicted[1]) as never,
      redFlags: [],
    },
  };
}

describe("scoreResults", () => {
  it("counts specialty, urgency and both", () => {
    const report = scoreResults([
      result("a", ["ENT", "low"], ["ENT", "low"]),
      result("b", ["ENT", "low"], ["ENT", "medium"]),
      result("c", ["ENT", "low"], ["Cardiology", "low"]),
      result("d", ["ENT", "low"], ["Cardiology", "medium"]),
    ]);

    expect(report.specialtyCorrect).toBe(2);
    expect(report.urgencyCorrect).toBe(2);
    expect(report.bothCorrect).toBe(1);
    expect(report.misses).toHaveLength(3);
  });

  // Errored cases must not silently count as correct, and must not inflate
  // the denominator either — an unreachable model should be visible as an
  // error count, not as a low score.
  it("excludes errored cases from the denominator", () => {
    const report = scoreResults([
      result("a", ["ENT", "low"], ["ENT", "low"]),
      result("b", ["ENT", "low"]),
    ]);

    expect(report.total).toBe(2);
    expect(report.errors).toBe(1);
    expect(report.scored).toBe(1);
    expect(report.specialtyCorrect).toBe(1);
  });

  it("reports emergency recall separately from overall accuracy", () => {
    const report = scoreResults([
      result("e1", ["Cardiology", "emergency"], ["Cardiology", "emergency"]),
      result("e2", ["Cardiology", "emergency"], ["Cardiology", "low"]),
      result("n1", ["ENT", "low"], ["ENT", "low"]),
    ]);

    expect(report.emergencyTotal).toBe(2);
    expect(report.emergencyCaught).toBe(1);
    expect(report.emergencyFalsePositives).toBe(0);
  });

  it("counts over-triage as a false alarm, not a miss of an emergency", () => {
    const report = scoreResults([
      result("n1", ["ENT", "low"], ["ENT", "emergency"]),
    ]);

    expect(report.emergencyFalsePositives).toBe(1);
    expect(report.emergencyTotal).toBe(0);
  });

  // The guard's contribution has to stay visible, or the eval quietly
  // credits the driver for urgency the red-flag net supplied.
  it("counts guard escalations, and how many were right", () => {
    const report = scoreResults([
      result(
        "e1",
        ["Cardiology", "emergency"],
        ["Cardiology", "emergency", "low"],
      ),
      result("n1", ["ENT", "low"], ["ENT", "emergency", "low"]),
      result("n2", ["ENT", "low"], ["ENT", "low"]),
    ]);

    expect(report.guardEscalated).toBe(2);
    expect(report.guardEscalatedCorrectly).toBe(1);
  });

  it("only reports rows for specialties present in the set", () => {
    const report = scoreResults([result("a", ["ENT", "low"], ["ENT", "low"])]);
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ specialty: "ENT", total: 1 });
  });
});

describe("percent", () => {
  it("formats a rate", () => {
    expect(percent(1, 2)).toBe("50.0%");
    expect(percent(7, 7)).toBe("100.0%");
  });

  it("does not divide by zero", () => {
    expect(percent(0, 0)).toBe("—");
  });
});

describe("formatTable", () => {
  it("aligns columns and underlines the header", () => {
    const table = formatTable(
      ["Specialty", "n"],
      [
        ["ENT", "5"],
        ["Cardiology", "12"],
      ],
    );

    expect(table.split("\n")).toEqual([
      "Specialty    n",
      "----------  --",
      "ENT          5",
      "Cardiology  12",
    ]);
  });
});
