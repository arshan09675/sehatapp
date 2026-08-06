import { createMockDriver } from "./drivers/mock";
import { createOllamaDriver } from "./drivers/ollama";
import { applyRedFlagGuard } from "./guard";
import { parseTriageResult } from "./schema";
import {
  TriageError,
  type TriageDriver,
  type TriageInput,
  type TriageOutcome,
} from "./types";

/**
 * The classify pipeline: resolve, drive, validate, guard.
 *
 *   resolveDriver()          (unknown name: throw, do not guess)
 *     -> driver.classify()   (unreachable: throw TriageError 'unavailable')
 *     -> Zod validate        (off-schema: throw TriageError 'invalid_response')
 *     -> applyRedFlagGuard() (escalate-only, reads the patient's own words)
 *
 * Validation lives here rather than in each driver so a driver cannot widen
 * the contract by accident — drivers return `unknown` and this is the only
 * gate. Adding a provider is one file plus one line in DRIVERS.
 *
 * classify() throws rather than falling back to the mock driver when a model
 * is unreachable. A silent swap would make the eval meaningless: the table
 * would mix rule-based and model rows with no way to tell which produced
 * which. The caller decides what a failure looks like — src/actions/triage.ts
 * turns it into a message with a link to /doctors, the eval records it as an
 * error row.
 */

type DriverFactory = () => TriageDriver;

const DRIVERS: Record<string, DriverFactory> = {
  mock: createMockDriver,
  ollama: createOllamaDriver,
  // claude: createClaudeDriver,   <- the whole change, when a key exists
};

export const DEFAULT_DRIVER = "mock";

/**
 * The configured driver.
 *
 * Defaults to `mock` when TRIAGE_DRIVER is unset, so a fresh clone with no
 * .env.local still has a working /triage page.
 */
export function resolveDriver(): TriageDriver {
  const name = process.env.TRIAGE_DRIVER?.trim() || DEFAULT_DRIVER;
  const factory = DRIVERS[name];
  if (!factory) {
    throw new TriageError(
      "misconfigured",
      `Unknown TRIAGE_DRIVER "${name}". Available: ${Object.keys(DRIVERS).join(", ")}.`,
    );
  }
  return factory();
}

/** Driver names available to TRIAGE_DRIVER — used by the eval's header. */
export function driverNames(): string[] {
  return Object.keys(DRIVERS);
}

/**
 * Classifies one description of symptoms.
 *
 * `driver` is injectable so the eval can pin one explicitly and tests do not
 * depend on process.env; production call sites omit it.
 */
export async function classify(
  input: TriageInput,
  driver: TriageDriver = resolveDriver(),
): Promise<TriageOutcome> {
  const raw = await driver.classify(input);

  const parsed = parseTriageResult(raw);
  if (!parsed.ok) {
    throw new TriageError(
      "invalid_response",
      `${driver.name} returned something that is not a valid triage result — ${parsed.error}`,
    );
  }

  const { specialty, urgency: driverUrgency, reasoning } = parsed.result;
  // The patient's own words, never the model's reasoning: see guard.ts.
  const verdict = applyRedFlagGuard(input.symptoms, driverUrgency);

  return {
    specialty,
    urgency: verdict.urgency,
    reasoning,
    driver: driver.name,
    driverUrgency,
    redFlags: verdict.redFlags,
  };
}
