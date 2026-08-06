/**
 * Symptom triage — the only module call sites import.
 *
 * Everything behind it (drivers, the prompt, the schema, the red-flag guard)
 * lives in lib/triage/, the same shape as lib/notify/. BUILD_PLAN.md Phase 7
 * specifies the Claude API; there is no key, so what ships is the seam — a
 * driver abstraction with a rule-based `mock` default and a local `ollama`
 * driver, both returning one Zod-validated shape. Adding `claude` later is one
 * file in triage/drivers/ plus one line in the DRIVERS map in triage/classify.ts,
 * and nothing above this line changes. See docs/TRIAGE.md.
 *
 * Unlike lib/notify, this file does NOT import "server-only". Nothing under
 * lib/triage/ touches cookies, Supabase or a request — it is pure classification,
 * and the eval harness (scripts/eval-triage.ts) runs exactly this code in plain
 * Node. The server boundary is src/actions/triage.ts, which is "use server".
 *
 * classify() throws TriageError on a driver that is unreachable or off-schema.
 * That is deliberate and the opposite of notify's never-throw rule: a
 * notification that fails should not fail a booking, but a triage result that
 * silently came from a different classifier than the one configured would make
 * both the page and the eval table lie about what produced it.
 */

export {
  DEFAULT_DRIVER,
  classify,
  driverNames,
  resolveDriver,
} from "./triage/classify";

export {
  RED_FLAGS,
  applyRedFlagGuard,
  type GuardVerdict,
} from "./triage/guard";

export {
  extractJsonObject,
  parseTriageResult,
  triageJsonSchema,
  triageResultSchema,
} from "./triage/schema";

export { TRIAGE_SYSTEM_PROMPT, buildUserPrompt } from "./triage/prompt";

export {
  TriageError,
  URGENCIES,
  type Specialty,
  type TriageDriver,
  type TriageErrorKind,
  type TriageInput,
  type TriageOutcome,
  type TriageResult,
  type Urgency,
} from "./triage/types";
