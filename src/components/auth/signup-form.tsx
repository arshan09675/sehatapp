"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUp } from "@/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { t } from "@/lib/i18n";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);

  if (state?.emailSent) {
    return (
      <Alert>
        <AlertTitle>{t("checkEmailTitle")}</AlertTitle>
        <AlertDescription>{t("checkEmailBody")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.formError && (
        <Alert variant="destructive">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      )}
      <FormField
        id="email"
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        required
        errors={state?.fieldErrors?.email}
      />
      <FormField
        id="password"
        name="password"
        type="password"
        label={t("password")}
        autoComplete="new-password"
        hint="At least 8 characters."
        required
        errors={state?.fieldErrors?.password}
      />
      <Button type="submit" disabled={pending} size="lg">
        {pending && <Spinner />}
        {t("signup")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("login")}
        </Link>
      </p>
    </form>
  );
}
