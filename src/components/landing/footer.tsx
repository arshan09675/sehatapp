import Link from "next/link";

import { cn } from "@/lib/utils";
import { container } from "./styles";
import { Logo } from "./logo";

const CONTACT_EMAIL = "salaam@sehatbook.pk";

// Column heading recipe, matching the uppercase field labels on the search card.
const heading =
  "text-ink-light text-[11.5px] font-semibold tracking-[.05em] uppercase";

const columns = [
  {
    title: "For Patients",
    links: [
      { label: "Find a Doctor", href: "/doctors" },
      { label: "How it works", href: "/#how" },
      { label: "FAQs", href: "/#faq" },
    ],
  },
  {
    title: "For Doctors",
    // Doctors are onboarded by an admin after PMC verification, so both of
    // these land on the shared login until that flow has a page of its own.
    links: [
      { label: "List your clinic", href: "/login" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-glass-line relative z-[2] border-t bg-[#070A14] pt-12 pb-10">
      <div className={cn(container, "text-muted-dark text-sm")}>
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 max-[860px]:grid-cols-2 max-[560px]:grid-cols-1">
          <div className="grid content-start justify-items-start gap-3 max-[860px]:col-span-2 max-[560px]:col-span-1">
            <Logo className="text-[19px]" />
            <p className="max-w-[300px] leading-[1.6]">
              Verified doctors, transparent fees — booking made simple in
              Lahore.
            </p>
            <p>
              In an emergency, call{" "}
              <a
                href="tel:1122"
                className="text-ink-light font-semibold hover:text-white"
              >
                1122
              </a>
              .
            </p>
          </div>

          {columns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="grid content-start justify-items-start gap-2.5"
            >
              <h2 className={heading}>{column.title}</h2>
              {column.links.map((link) =>
                link.href.startsWith("mailto:") ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="hover:text-white"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="hover:text-white"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>

        <div className="border-glass-line mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <span>© 2026 SehatBook · Built in Lahore</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
