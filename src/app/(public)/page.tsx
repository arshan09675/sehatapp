import Link from "next/link";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-primary text-5xl font-bold tracking-tight sm:text-6xl">
        {t("brand")}
      </h1>
      <p className="text-muted-foreground max-w-xl text-lg text-balance">
        {t("tagline")}
      </p>
      <Button asChild size="lg">
        <Link href="/doctors">{t("findADoctor")}</Link>
      </Button>
    </main>
  );
}
