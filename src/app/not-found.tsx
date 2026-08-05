import type { Metadata } from "next";
import Link from "next/link";

import { btn, btnPrimary, container } from "@/components/landing/styles";
import { PublicShell } from "@/components/public/public-shell";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found — SehatBook",
};

/**
 * Catches both unmatched URLs and notFound() from inside the app — most often
 * a doctor profile that is no longer listed. The root layout is a bare shell,
 * so this brings its own chrome; PublicShell gives a stranded visitor the full
 * nav to recover with.
 */
export default function NotFound() {
  return (
    <PublicShell>
      <div className={cn(container, "flex justify-center py-12")}>
        <div className="bg-surface shadow-card grid max-w-md justify-items-center gap-3 rounded-2xl p-8 text-center">
          <h1 className="font-heading text-ink text-2xl font-semibold">
            This page does not exist
          </h1>
          <p className="text-ink-muted text-sm">
            The link may be old, or the page may have moved. If a doctor&apos;s
            profile brought you here, they may no longer be listed.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Link href="/" className={cn(btn, btnPrimary, "min-h-11")}>
              Back to home
            </Link>
            <Link
              href="/doctors"
              className={cn(btn, "bg-brand-soft text-brand-strong min-h-11")}
            >
              Find a doctor
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
