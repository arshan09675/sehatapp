"use client";

import { useActionState } from "react";

import { resetDoctorPassword } from "@/actions/doctors";
import { CopyButton } from "@/components/admin/copy-button";
import { PendingButton } from "@/components/admin/pending-button";

/** Issues a fresh temporary password and shows it once, with a copy button. */
export function ResetPasswordButton({ doctorId }: { doctorId: string }) {
  const [state, action] = useActionState(resetDoctorPassword, undefined);

  if (state?.credentials) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">New temporary password:</span>
        <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
          {state.credentials.tempPassword}
        </code>
        <CopyButton value={state.credentials.tempPassword} label="Copy" />
      </div>
    );
  }

  return (
    <form action={action} className="grid justify-items-start gap-1.5">
      <PendingButton
        variant="outline"
        size="sm"
        confirmMessage="Reset this doctor's password? Their current password stops working immediately."
      >
        Reset password
      </PendingButton>
      {state?.formError && (
        <p className="text-destructive text-xs">{state.formError}</p>
      )}
      <input type="hidden" name="doctorId" value={doctorId} />
    </form>
  );
}
