"use client";

import Link from "next/link";

import { btn, btnPrimary } from "@/components/landing/styles";
import { cn } from "@/lib/utils";

export default function PublicError({
  unstable_retry,
}: {
  error: Error;
  unstable_retry: () => void;
}) {
  return (
    <div className="bg-surface-dim flex flex-1 items-center justify-center px-4 py-24">
      <div className="bg-surface shadow-card grid max-w-md justify-items-center gap-3 rounded-2xl p-8 text-center">
        <h1 className="font-heading text-ink text-2xl font-semibold">
          This page could not be loaded
        </h1>
        <p className="text-ink-muted text-sm">
          Something went wrong on our side. Nothing was booked — try again, or
          browse the full list of doctors.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className={cn(btn, btnPrimary, "min-h-11")}
          >
            Try again
          </button>
          <Link
            href="/doctors"
            className={cn(btn, "bg-brand-soft text-brand-strong min-h-11")}
          >
            Find a doctor
          </Link>
        </div>
      </div>
    </div>
  );
}
