/**
 * The triage vocabulary and the driver contract.
 *
 * Kept free of imports (except the specialty list, which is itself import-free)
 * so both halves can depend on it without a cycle — drivers produce these
 * shapes, schema.ts validates them, classify.ts sits in the middle.
 *
 * Nothing under src/lib/triage/ imports "server-only", unlike src/lib/notify.
 * That is deliberate: triage touches no database and no cookies, and the eval
 * harness (scripts/eval-triage.ts) runs this exact code in plain Node. The
 * server boundary lives one level up, in src/actions/triage.ts.
 */

import type { Specialty } from "../specialties";

export type { Specialty };

/**
 * Ordered least to most urgent. The order is load-bearing: guard.ts compares
 * by index to guarantee it can only ever escalate.
 */
export const URGENCIES = ["low", "medium", "emergency"] as const;

export type Urgency = (typeof URGENCIES)[number];

/** What a driver is asked to classify. */
export type TriageInput = {
  /** The patient's own words, English or Roman Urdu. Never pre-translated. */
  symptoms: string;
};

/**
 * One classification, after validation.
 *
 * This is the contract every driver returns and the page renders — swapping
 * TRIAGE_DRIVER changes nothing downstream of here.
 */
export type TriageResult = {
  specialty: Specialty;
  urgency: Urgency;
  /** One or two sentences a patient can read. Never empty. */
  reasoning: string;
};

/**
 * A result plus how it was produced. The extras live outside TriageResult so
 * the validated shape stays exactly the three fields the brief specifies.
 */
export type TriageOutcome = TriageResult & {
  /** Which driver classified this — surfaced in the eval header and dev logs. */
  driver: string;
  /**
   * Urgency as the driver returned it, before the red-flag guard.
   * Differs from `urgency` only when the guard escalated.
   */
  driverUrgency: Urgency;
  /** Red flags found in the patient's text. Empty when the guard did nothing. */
  redFlags: readonly string[];
};

/** Why a classification could not be produced. Drives the message the patient sees. */
export type TriageErrorKind =
  /** The driver could not be reached — Ollama not running, network refused. */
  | "unavailable"
  /** The driver answered, but not with JSON matching the schema. */
  | "invalid_response"
  /** TRIAGE_DRIVER names a driver that does not exist. */
  | "misconfigured";

export class TriageError extends Error {
  readonly kind: TriageErrorKind;

  constructor(kind: TriageErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TriageError";
    this.kind = kind;
  }
}

/**
 * What a classifier must implement.
 *
 * Adding a provider is one file plus one line in classify.ts — see
 * docs/TRIAGE.md. A driver returns unvalidated data; classify.ts is what
 * enforces the schema, so a driver cannot widen the contract by accident.
 */
export interface TriageDriver {
  /** Appears in the eval header and the dev console prefix. */
  readonly name: string;
  /** Extra detail for the eval header, e.g. the Ollama model name. */
  readonly detail?: string;
  classify(input: TriageInput): Promise<unknown>;
}
