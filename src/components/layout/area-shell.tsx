import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import type { Profile } from "@/lib/auth/dal";
import { t } from "@/lib/i18n";

/** Shared chrome for the authenticated areas (/dashboard, /doctor, /admin). */
export function AreaShell({
  profile,
  areaLabel,
  children,
}: {
  profile: Profile;
  areaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-border border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="text-primary font-bold tracking-tight">
              {t("brand")}
            </Link>
            <span className="text-muted-foreground text-sm">{areaLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {profile.full_name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
