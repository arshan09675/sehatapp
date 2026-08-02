import Link from "next/link";

import { t } from "@/lib/i18n";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <Link href="/" className="text-primary text-2xl font-bold tracking-tight">
        {t("brand")}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
