"use client";

import { useActionState } from "react";

import { deleteClinic } from "@/actions/clinics";
import { PendingButton } from "@/components/admin/pending-button";

export function DeleteClinicButton({
  clinicId,
  clinicName,
}: {
  clinicId: string;
  clinicName: string;
}) {
  const [state, action] = useActionState(
    deleteClinic.bind(null, clinicId),
    undefined,
  );

  return (
    <form action={action} className="grid justify-items-start gap-1.5">
      <PendingButton
        variant="destructive"
        confirmMessage={`Delete “${clinicName}”? Doctors assigned here lose the assignment. This cannot be undone.`}
      >
        Delete clinic
      </PendingButton>
      {state?.formError && (
        <p className="text-destructive text-xs">{state.formError}</p>
      )}
    </form>
  );
}
