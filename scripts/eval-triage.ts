/**
 * The triage eval harness — BUILD_PLAN.md Phase 7's measurable result.
 *
 *   npm run eval:triage
 *   TRIAGE_DRIVER=ollama npm run eval:triage
 *   npm run eval:triage -- --json > results.json
 *
 * Runs every labelled case in src/lib/triage/eval/cases.json through whichever
 * driver TRIAGE_DRIVER selects, and prints per-specialty and overall accuracy.
 * The point is comparing drivers on a fixed set — run it once per driver and
 * put the tables side by side. See docs/TRIAGE.md for what the numbers do and
 * do not mean.
 *
 * Run through jiti (see package.json): Node can execute TypeScript directly,
 * but not with the extensionless relative imports this codebase uses.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { classify, resolveDriver } from "../src/lib/triage";
import { TriageError } from "../src/lib/triage/types";
import {
  formatReport,
  scoreResults,
  type CaseResult,
  type EvalCase,
} from "../src/lib/triage/eval/score";

const CASES_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "lib",
  "triage",
  "eval",
  "cases.json",
);

function loadCases(): EvalCase[] {
  return JSON.parse(readFileSync(CASES_PATH, "utf8")) as EvalCase[];
}

async function main() {
  const asJson = process.argv.includes("--json");
  const cases = loadCases();

  // Resolved once and passed in, so every case provably goes through the same
  // driver instance — and a misconfigured TRIAGE_DRIVER fails immediately
  // rather than 50 times.
  const driver = resolveDriver();

  const results: CaseResult[] = [];

  // Progress only on a real terminal: \r redraws in place there, but piped to
  // a file or a CI log it just concatenates 50 lines of noise ahead of the table.
  const showProgress = !asJson && process.stderr.isTTY;

  for (const [index, testCase] of cases.entries()) {
    if (showProgress) {
      // Sequential with visible progress: a local model takes seconds per
      // case, and a silent two-minute wait looks like a hang.
      process.stderr.write(
        `\r  ${index + 1}/${cases.length} ${testCase.id.padEnd(12)}`,
      );
    }

    try {
      const outcome = await classify({ symptoms: testCase.text }, driver);
      results.push({
        case: testCase,
        prediction: {
          specialty: outcome.specialty,
          urgency: outcome.urgency,
          driverUrgency: outcome.driverUrgency,
          redFlags: outcome.redFlags,
        },
      });
    } catch (cause) {
      results.push({
        case: testCase,
        error:
          cause instanceof TriageError
            ? `${cause.kind}: ${cause.message}`
            : cause instanceof Error
              ? cause.message
              : String(cause),
      });
    }
  }

  if (showProgress) process.stderr.write(`\r${" ".repeat(30)}\r`);

  const report = scoreResults(results);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          driver: driver.name,
          detail: driver.detail ?? null,
          generatedAt: new Date().toISOString(),
          report,
          results,
        },
        null,
        2,
      ),
    );
    return;
  }

  const detail = driver.detail ? ` (${driver.detail})` : "";
  console.log(
    formatReport(
      report,
      `SehatBook triage eval — driver: ${driver.name}${detail} — ${report.total} cases`,
    ),
  );

  // Errors are listed after the table rather than thrown: one unreachable
  // model should still leave you with the rows that did run.
  const failed = results.filter((result) => result.error);
  if (failed.length > 0) {
    console.log("\nErrors:");
    for (const result of failed) {
      console.log(`  ${result.case.id.padEnd(10)} ${result.error}`);
    }
  }
}

main().catch((cause) => {
  // A TriageError here is a misconfigured TRIAGE_DRIVER — no table to print.
  console.error(cause instanceof Error ? cause.message : cause);
  process.exit(1);
});
