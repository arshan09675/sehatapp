"use server";

import { classify, TriageError, type TriageOutcome } from "@/lib/triage";
import { symptomsSchema } from "@/lib/validators/triage";

/**
 * Symptom triage.
 *
 * Public — no auth, deliberately. A patient working out which kind of doctor
 * they need should not have to make an account first, and nothing here reads
 * or writes their data.
 *
 * Nothing is persisted either. Symptom text is health data: storing it needs
 * its own table, RLS policy and consent copy, and Phase 7's deliverable is the
 * classifier and its eval, not a record of who typed what. See docs/TRIAGE.md.
 */

export type TriageState =
  | {
      result?: TriageOutcome;
      /** What the patient submitted, so a rejected form can show it again. */
      symptoms?: string;
      /**
       * Submission counter. React resets uncontrolled fields once a form
       * action resolves, so an invalid submission would otherwise wipe the
       * paragraph the patient just typed. The form keys the textarea on this
       * to remount it with `symptoms` as its new default.
       */
      attempt: number;
      fieldErrors?: { symptoms?: string[] };
      formError?: string;
    }
  | undefined;

/**
 * What the patient reads when the classifier could not answer.
 *
 * Never the raw TriageError message — those name ports, models and shell
 * commands, which is right for a developer's terminal and useless to someone
 * describing a rash. Each one still ends with something they can do now.
 */
const FAILURE_MESSAGES: Record<TriageError["kind"], string> = {
  unavailable:
    "The symptom checker is not responding right now. You can still browse doctors by specialty, or try again in a moment.",
  invalid_response:
    "The symptom checker could not read that clearly. Try describing your symptoms in a sentence or two, or browse doctors by specialty.",
  misconfigured:
    "The symptom checker is unavailable right now. You can browse doctors by specialty instead.",
};

export async function triageSymptoms(
  prev: TriageState,
  formData: FormData,
): Promise<TriageState> {
  const attempt = (prev?.attempt ?? 0) + 1;
  const raw = formData.get("symptoms");
  // Echoed back even when invalid, so nothing the patient typed is lost.
  const submitted = typeof raw === "string" ? raw : undefined;

  const parsed = symptomsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      attempt,
      symptoms: submitted,
      fieldErrors: { symptoms: [parsed.error.issues[0].message] },
    };
  }

  const symptoms = parsed.data;

  try {
    const result = await classify({ symptoms });
    return { result, symptoms, attempt };
  } catch (cause) {
    // Logged in full server-side: a misconfigured TRIAGE_DRIVER or a stopped
    // Ollama should be obvious in the terminal, not swallowed into a friendly
    // sentence with no trace of what actually broke.
    console.error("[triage] classification failed:", cause);

    const kind = cause instanceof TriageError ? cause.kind : "unavailable";
    return { formError: FAILURE_MESSAGES[kind], symptoms, attempt };
  }
}
