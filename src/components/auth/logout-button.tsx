"use client";

import { useFormStatus } from "react-dom";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { t } from "@/lib/i18n";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending && <Spinner />}
      {t("logout")}
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={signOut}>
      <SubmitButton />
    </form>
  );
}
