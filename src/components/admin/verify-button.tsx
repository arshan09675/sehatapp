"use client";

import { useActionState } from "react";

import { verifyDoctor } from "@/actions/doctors";
import { PendingButton } from "@/components/admin/pending-button";

/**
 * "Mark as verified" form used in the verification queue and on the doctor
 * detail page. The confirm prompt is a deliberate speed bump: verification
 * asserts the admin actually checked the PMC number on the PMDC register.
 */
export function VerifyButton({ doctorId }: { doctorId: string }) {
  const [state, action] = useActionState(verifyDoctor, undefined);

  return (
    <form action={action} className="grid justify-items-start gap-1.5">
      <input type="hidden" name="doctorId" value={doctorId} />
      <PendingButton
        size="sm"
        confirmMessage="Have you checked this PMC number on the PMDC register? This makes the doctor publicly bookable."
      >
        Mark as verified
      </PendingButton>
      {state?.formError && (
        <p className="text-destructive text-xs">{state.formError}</p>
      )}
    </form>
  );
}
