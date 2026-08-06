import { specialties, type Specialty } from "../../specialties";
import type { Urgency } from "../types";

/**
 * Scoring and table formatting for the eval harness.
 *
 * Pure on purpose: scripts/eval-triage.ts does the I/O and the driver calls,
 * everything here is data in, strings out, and unit-tested. The numbers in the
 * FYP report come out of this file, so it should be possible to check them by
 * reading it.
 */

export type EvalCase = {
  id: string;
  lang: "en" | "ur-roman";
  text: string;
  specialty: Specialty;
  urgency: Urgency;
};

export type Prediction = {
  specialty: Specialty;
  urgency: Urgency;
  /** Before the red-flag guard, so the guard's contribution stays visible. */
  driverUrgency: Urgency;
  redFlags: readonly string[];
};

/** One case, run. `error` is set when the driver failed on it. */
export type CaseResult = {
  case: EvalCase;
  prediction?: Prediction;
  error?: string;
};

export type SpecialtyRow = {
  specialty: Specialty;
  total: number;
  specialtyCorrect: number;
  urgencyCorrect: number;
};

export type Report = {
  total: number;
  errors: number;
  /** Cases that actually produced a prediction — the denominator throughout. */
  scored: number;
  specialtyCorrect: number;
  urgencyCorrect: number;
  bothCorrect: number;
  rows: SpecialtyRow[];
  /** Of the cases labelled emergency, how many were called emergency. */
  emergencyTotal: number;
  emergencyCaught: number;
  /** Called emergency when the label was not. Over-triage, not a safety failure. */
  emergencyFalsePositives: number;
  /** Cases where the red-flag guard raised the driver's urgency. */
  guardEscalated: number;
  /** Of those escalations, how many were on a case truly labelled emergency. */
  guardEscalatedCorrectly: number;
  misses: CaseResult[];
};

export function scoreResults(results: readonly CaseResult[]): Report {
  const scored = results.filter(
    (result): result is CaseResult & { prediction: Prediction } =>
      result.prediction !== undefined,
  );

  const rows: SpecialtyRow[] = specialties
    .map((specialty) => {
      const forSpecialty = scored.filter(
        (result) => result.case.specialty === specialty,
      );
      return {
        specialty,
        total: forSpecialty.length,
        specialtyCorrect: forSpecialty.filter(
          (result) => result.prediction.specialty === specialty,
        ).length,
        urgencyCorrect: forSpecialty.filter(
          (result) => result.prediction.urgency === result.case.urgency,
        ).length,
      };
    })
    .filter((row) => row.total > 0);

  const emergencies = scored.filter(
    (result) => result.case.urgency === "emergency",
  );

  return {
    total: results.length,
    errors: results.length - scored.length,
    scored: scored.length,
    specialtyCorrect: scored.filter(
      (result) => result.prediction.specialty === result.case.specialty,
    ).length,
    urgencyCorrect: scored.filter(
      (result) => result.prediction.urgency === result.case.urgency,
    ).length,
    bothCorrect: scored.filter(
      (result) =>
        result.prediction.specialty === result.case.specialty &&
        result.prediction.urgency === result.case.urgency,
    ).length,
    rows,
    emergencyTotal: emergencies.length,
    emergencyCaught: emergencies.filter(
      (result) => result.prediction.urgency === "emergency",
    ).length,
    emergencyFalsePositives: scored.filter(
      (result) =>
        result.prediction.urgency === "emergency" &&
        result.case.urgency !== "emergency",
    ).length,
    guardEscalated: scored.filter(
      (result) => result.prediction.driverUrgency !== result.prediction.urgency,
    ).length,
    guardEscalatedCorrectly: scored.filter(
      (result) =>
        result.prediction.driverUrgency !== result.prediction.urgency &&
        result.case.urgency === "emergency",
    ).length,
    misses: scored.filter(
      (result) =>
        result.prediction.specialty !== result.case.specialty ||
        result.prediction.urgency !== result.case.urgency,
    ),
  };
}

export function percent(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

/** Left-aligns the first column, right-aligns the rest. */
export function formatTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => row[column]?.length ?? 0)),
  );

  const line = (cells: readonly string[]) =>
    cells
      .map((cell, column) =>
        column === 0
          ? cell.padEnd(widths[column])
          : cell.padStart(widths[column]),
      )
      .join("  ")
      .trimEnd();

  return [
    line(headers),
    widths.map((width) => "-".repeat(width)).join("  "),
    ...rows.map(line),
  ].join("\n");
}

/**
 * The report as printed.
 *
 * Emergency recall is pulled out of the overall number deliberately: an
 * emergency called "low" is the one error in this system that can hurt
 * somebody, and it is invisible in a single accuracy figure that averages it
 * against nosebleeds.
 */
export function formatReport(report: Report, header: string): string {
  const rows = report.rows.map((row) => [
    row.specialty,
    String(row.total),
    `${row.specialtyCorrect}/${row.total}`,
    percent(row.specialtyCorrect, row.total),
    `${row.urgencyCorrect}/${row.total}`,
    percent(row.urgencyCorrect, row.total),
  ]);

  const table = formatTable(
    ["Specialty", "n", "Spec.", "Spec. %", "Urg.", "Urg. %"],
    rows,
  );

  const overall = formatTable(
    ["Metric", "Score", "Rate"],
    [
      [
        "Specialty accuracy",
        `${report.specialtyCorrect}/${report.scored}`,
        percent(report.specialtyCorrect, report.scored),
      ],
      [
        "Urgency accuracy",
        `${report.urgencyCorrect}/${report.scored}`,
        percent(report.urgencyCorrect, report.scored),
      ],
      [
        "Both correct",
        `${report.bothCorrect}/${report.scored}`,
        percent(report.bothCorrect, report.scored),
      ],
      [
        "Emergency recall",
        `${report.emergencyCaught}/${report.emergencyTotal}`,
        percent(report.emergencyCaught, report.emergencyTotal),
      ],
      [
        "Emergency false alarms",
        `${report.emergencyFalsePositives}/${report.scored - report.emergencyTotal}`,
        percent(
          report.emergencyFalsePositives,
          report.scored - report.emergencyTotal,
        ),
      ],
    ],
  );

  const sections = [
    header,
    "",
    table,
    "",
    overall,
    "",
    `Red-flag guard escalated ${report.guardEscalated} case${
      report.guardEscalated === 1 ? "" : "s"
    }` +
      (report.guardEscalated > 0
        ? ` (${report.guardEscalatedCorrectly} on a case labelled emergency).`
        : "."),
  ];

  if (report.errors > 0) {
    sections.push(
      `${report.errors} case${report.errors === 1 ? "" : "s"} could not be classified — see below.`,
    );
  }

  if (report.misses.length > 0) {
    sections.push("", `Misses (${report.misses.length}):`);
    for (const miss of report.misses) {
      const predicted = miss.prediction;
      if (!predicted) continue;
      const parts: string[] = [];
      if (predicted.specialty !== miss.case.specialty) {
        parts.push(
          `specialty ${miss.case.specialty} -> ${predicted.specialty}`,
        );
      }
      if (predicted.urgency !== miss.case.urgency) {
        parts.push(`urgency ${miss.case.urgency} -> ${predicted.urgency}`);
      }
      sections.push(
        `  ${miss.case.id.padEnd(10)} ${parts.join(", ")}`,
        `             "${miss.case.text}"`,
      );
    }
  }

  return sections.join("\n");
}
