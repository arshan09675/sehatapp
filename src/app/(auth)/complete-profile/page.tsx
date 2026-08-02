import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/auth/routes";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Complete your profile — SehatBook",
};

export default async function CompleteProfilePage() {
  const profile = await requireProfile();
  if (profile.phone) redirect(ROLE_HOME[profile.role]);

  // The DB trigger seeds full_name with a placeholder; don't prefill that.
  const defaultFullName =
    profile.full_name === "User" ? undefined : profile.full_name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("completeProfileTitle")}</CardTitle>
        <CardDescription>{t("completeProfileSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <CompleteProfileForm defaultFullName={defaultFullName} />
      </CardContent>
    </Card>
  );
}
