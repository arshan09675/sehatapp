"use client";

import { useActionState } from "react";

import { completeProfile } from "@/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { t } from "@/lib/i18n";

export function CompleteProfileForm({
  defaultFullName,
}: {
  defaultFullName?: string;
}) {
  const [state, action, pending] = useActionState(completeProfile, undefined);

  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.formError && (
        <Alert variant="destructive">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      )}
      <FormField
        id="fullName"
        name="fullName"
        label={t("fullName")}
        autoComplete="name"
        defaultValue={defaultFullName}
        required
        errors={state?.fieldErrors?.fullName}
      />
      <FormField
        id="phone"
        name="phone"
        type="tel"
        label={t("phone")}
        autoComplete="tel"
        hint={t("phoneHint")}
        placeholder="0300 1234567"
        required
        errors={state?.fieldErrors?.phone}
      />
      <Button type="submit" disabled={pending} size="lg">
        {pending && <Spinner />}
        {t("saveAndContinue")}
      </Button>
    </form>
  );
}
