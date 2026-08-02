import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Sign up — SehatBook" };

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("createAccount")}</CardTitle>
        <CardDescription>{t("signupSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
