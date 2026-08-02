"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { t } from "@/lib/i18n";

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [state, action, pending] = useActionState(signIn, undefined);
  const formError = state?.formError ?? (state ? undefined : initialError);

  return (
    <form action={action} className="grid gap-4" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="next" value={next ?? ""} />
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
        autoComplete="current-password"
        required
        errors={state?.fieldErrors?.password}
      />
      <Button type="submit" disabled={pending} size="lg">
        {pending && <Spinner />}
        {t("login")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {t("noAccountYet")}{" "}
        <Link
          href="/signup"
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("signup")}
        </Link>
      </p>
    </form>
  );
}
