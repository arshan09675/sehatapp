import { container } from "@/components/landing/styles";
import { PublicShell } from "@/components/public/public-shell";
import { cn } from "@/lib/utils";

/**
 * Chrome for the plain-prose pages (privacy, terms). The descendant variants
 * carry the body styling so the pages themselves stay readable as copy —
 * Design.md puts the floor for body text at 16px, hence text-base.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <PublicShell>
      <div className={container}>
        <article
          className={cn(
            "mx-auto grid max-w-[720px] gap-7",
            "[&_p]:text-ink [&_p]:text-base [&_p]:leading-[1.7]",
            "[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2",
            "[&_li]:text-ink [&_li]:text-base [&_li]:leading-[1.7]",
          )}
        >
          <header className="grid gap-3">
            <h1 className="font-heading text-ink text-[clamp(24px,3.2vw,34px)] font-semibold tracking-[-0.01em]">
              {title}
            </h1>
            <p className="text-ink-muted !text-sm">Last updated {updated}</p>
            <p>{intro}</p>
          </header>
          {children}
        </article>
      </div>
    </PublicShell>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2.5">
      <h2 className="font-heading text-ink text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
