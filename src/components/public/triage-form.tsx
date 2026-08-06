"use client";

import Link from "next/link";
import { useActionState } from "react";

import { triageSymptoms } from "@/actions/triage";
import { btn, btnPrimary } from "@/components/landing/styles";
import { Spinner } from "@/components/ui/spinner";
import type { TriageOutcome, Urgency } from "@/lib/triage";
import { MAX_SYMPTOMS_LENGTH } from "@/lib/validators/triage";
import { cn } from "@/lib/utils";

/**
 * The /triage surface: describe symptoms, get a specialty and an urgency.
 *
 * One form, one result — not a chat. A single description is what the eval
 * harness feeds each case, so what the page does and what the reported
 * accuracy measures are the same path.
 *
 * Emergency results never show doctor results. That is the whole point of the
 * urgency field: booking an appointment for chest pain is the wrong outcome,
 * so the emergency branch replaces the result card rather than decorating it.
 */

const CARD = "bg-surface shadow-card rounded-2xl p-6 max-[560px]:p-5";

/** Small print, on every state. This is guidance, not a diagnosis. */
function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn("text-ink-muted text-[13.5px] leading-relaxed", className)}
    >
      This is guidance, not a diagnosis. It suggests which kind of doctor to see
      — only a doctor can tell you what is wrong.
    </p>
  );
}

const URGENCY_CHIP: Record<Exclude<Urgency, "emergency">, string> = {
  low: "bg-brand-soft text-brand-strong",
  // DESIGN.md reserves amber for exactly this sort of "attention, not alarm".
  medium: "bg-amber-soft text-[#8A5A00]",
};

const URGENCY_LABEL: Record<Exclude<Urgency, "emergency">, string> = {
  low: "Routine",
  medium: "See a doctor soon",
};

export function TriageForm() {
  const [state, action, pending] = useActionState(triageSymptoms, undefined);
  const result = state?.result;

  if (result?.urgency === "emergency") {
    return <EmergencyPanel result={result} />;
  }

  if (result) {
    return <ResultPanel result={result} />;
  }

  return (
    <form action={action} className={CARD} noValidate>
      <label htmlFor="symptoms" className="block">
        <span className="text-ink font-heading block text-[19px] font-semibold">
          Describe your symptoms
        </span>
        <span
          dir="rtl"
          lang="ur"
          className="text-ink-muted font-urdu mt-1 block text-[15px]"
        >
          اپنی علامات بتائیں
        </span>
      </label>

      <textarea
        // React clears uncontrolled fields once a form action resolves. Keying
        // on the submission counter remounts this with the rejected text as its
        // new default, so a validation error costs a correction rather than the
        // whole paragraph — which on a phone is the difference between fixing
        // it and giving up.
        key={state?.attempt ?? 0}
        id="symptoms"
        name="symptoms"
        rows={5}
        required
        maxLength={MAX_SYMPTOMS_LENGTH}
        defaultValue={state?.symptoms ?? ""}
        aria-invalid={state?.fieldErrors?.symptoms ? true : undefined}
        aria-describedby="symptoms-hint"
        placeholder="Mujhe 3 din se bukhar aur khansi hai…"
        // 16px minimum: below that iOS zooms the whole page on focus, and
        // DESIGN.md does not let body text shrink to fit a layout anyway.
        className={cn(
          "border-line bg-surface-dim text-ink placeholder:text-ink-muted/70 focus:border-brand focus:ring-brand/20 mt-4 w-full rounded-xl border px-4 py-3 text-base transition-colors duration-150 outline-none focus:ring-3",
          state?.fieldErrors?.symptoms && "border-danger focus:border-danger",
        )}
      />

      {state?.fieldErrors?.symptoms && (
        <p className="text-danger mt-2 text-sm" role="alert">
          {state.fieldErrors.symptoms[0]}
        </p>
      )}

      <p id="symptoms-hint" className="text-ink-muted mt-2 text-sm">
        English ya Roman Urdu — dono chalte hain.
      </p>

      {state?.formError && (
        <div
          role="alert"
          className="border-danger/30 bg-danger-soft text-ink mt-4 rounded-xl border px-4 py-3 text-sm"
        >
          <p>{state.formError}</p>
          <Link
            href="/doctors"
            className="text-brand-strong mt-1 inline-block font-semibold underline underline-offset-2"
          >
            Browse doctors by specialty
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          btn,
          btnPrimary,
          "mt-5 w-full disabled:cursor-not-allowed disabled:opacity-70",
        )}
      >
        {pending && <Spinner />}
        {pending ? "Checking your symptoms…" : "Check my symptoms"}
      </button>

      <Disclaimer className="mt-4" />
    </form>
  );
}

/**
 * Non-emergency result.
 *
 * The reasoning is shown rather than being thrown away on an immediate
 * redirect: a patient who can see *why* it said Dermatology can tell when it
 * has misread them, which a silent redirect to a filtered list cannot.
 */
function ResultPanel({ result }: { result: TriageOutcome }) {
  const urgency = result.urgency as Exclude<Urgency, "emergency">;

  return (
    <div className={CARD}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold",
          URGENCY_CHIP[urgency],
        )}
      >
        {URGENCY_LABEL[urgency]}
      </span>

      <p className="text-ink-muted mt-5 text-[13px] font-semibold tracking-[.05em] uppercase">
        Suggested specialty
      </p>
      <p className="font-heading text-ink mt-1 text-[26px] font-semibold">
        {result.specialty}
      </p>

      <p className="text-ink-muted mt-5 text-[13px] font-semibold tracking-[.05em] uppercase">
        Why
      </p>
      <p className="text-ink mt-1 text-base leading-relaxed">
        {result.reasoning}
      </p>

      <Link
        href={`/doctors?specialty=${encodeURIComponent(result.specialty)}`}
        className={cn(btn, btnPrimary, "mt-6 w-full")}
      >
        See {result.specialty} doctors in Lahore
      </Link>

      <div className="mt-3 text-center">
        <Link
          href="/triage"
          className="text-ink-muted hover:text-ink text-sm font-medium underline underline-offset-2"
        >
          Start over
        </Link>
      </div>

      <Disclaimer className="border-line mt-5 border-t pt-4" />
    </div>
  );
}

/**
 * Emergency result.
 *
 * Deliberately not a variant of the result card: no specialty heading, no
 * link to doctors, nothing that reads as "book something". DESIGN.md gives
 * emergency states weight rather than animation, so this is flat colour and
 * type size — no blinking, no pulse.
 *
 * The copy matches what the footer and the FAQ already tell people
 * (src/components/landing/footer.tsx, faq.tsx), so the one moment it matters
 * most is not the one place the wording is different.
 */
function EmergencyPanel({ result }: { result: TriageOutcome }) {
  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger-soft rounded-2xl border-2 p-6 max-[560px]:p-5"
    >
      <p className="text-danger text-[13px] font-bold tracking-[.08em] uppercase">
        Emergency — do not book an appointment
      </p>

      <h2 className="font-heading text-ink mt-2 text-[clamp(24px,4vw,32px)] leading-tight font-bold">
        Go to the nearest emergency room now
      </h2>
      <p
        dir="rtl"
        lang="ur"
        className="text-ink font-urdu mt-2 text-[17px] font-semibold"
      >
        فوراً قریبی ایمرجنسی روم جائیں
      </p>

      <p className="text-ink mt-4 text-base leading-relaxed">
        {result.reasoning}
      </p>

      {result.redFlags.length > 0 && (
        <p className="text-ink-muted mt-3 text-sm">
          Based on what you described: {result.redFlags.join(", ")}.
        </p>
      )}

      <a
        href="tel:1122"
        className={cn(
          btn,
          "bg-danger mt-6 w-full text-white shadow-[0_10px_28px_rgba(229,72,77,.35)] hover:shadow-[0_16px_38px_rgba(229,72,77,.45)]",
        )}
      >
        Call 1122 now
      </a>

      <p className="text-ink-muted mt-4 text-sm leading-relaxed">
        If someone can drive you, go straight to the nearest hospital emergency
        department. Do not wait for an appointment.
      </p>

      <div className="border-danger/20 mt-5 border-t pt-4">
        <Disclaimer />
        <Link
          href="/triage"
          className="text-ink-muted hover:text-ink mt-3 inline-block text-sm font-medium underline underline-offset-2"
        >
          Start over
        </Link>
      </div>
    </div>
  );
}
