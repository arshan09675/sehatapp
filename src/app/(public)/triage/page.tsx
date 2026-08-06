import type { Metadata } from "next";
import Link from "next/link";

import { container } from "@/components/landing/styles";
import { PublicShell } from "@/components/public/public-shell";
import { TriageForm } from "@/components/public/triage-form";
import { specialties } from "@/lib/specialties";

export const metadata: Metadata = {
  title: "Check your symptoms",
  description:
    "Describe your symptoms in English or Roman Urdu and find out which kind of doctor to see. Guidance, not a diagnosis.",
};

export default function TriagePage() {
  return (
    <PublicShell>
      <div className={container}>
        <div className="mx-auto max-w-[640px]">
          <h1 className="font-heading text-ink text-[clamp(26px,3.6vw,36px)] font-semibold tracking-[-0.01em]">
            Not sure which doctor you need?
          </h1>
          <p className="text-ink-muted mt-3 text-base leading-relaxed">
            Describe what you are feeling and we will suggest the right
            specialty, and tell you how urgent it looks. Free, and you do not
            need an account.
          </p>

          <div className="mt-7">
            <TriageForm />
          </div>

          <div className="border-line mt-8 border-t pt-6">
            <p className="text-ink-muted text-[13px] font-semibold tracking-[.05em] uppercase">
              Or browse by specialty
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <Link
                  key={specialty}
                  href={`/doctors?specialty=${encodeURIComponent(specialty)}`}
                  className="border-line bg-surface text-ink hover:border-brand hover:text-brand-strong inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-150"
                >
                  {specialty}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
