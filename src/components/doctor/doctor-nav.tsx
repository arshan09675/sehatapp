"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** The reference's `.appnav` underline tabs. Mirrors AdminNav's structure. */
const LINKS = [
  { href: "/doctor", label: "Appointments", exact: true },
  { href: "/doctor/schedule", label: "Schedule" },
  { href: "/doctor/profile", label: "Profile" },
];

export function DoctorNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Doctor" className="border-line -mx-4 border-b px-4">
      <ul className="flex gap-1 overflow-x-auto">
        {LINKS.map(({ href, label, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-ink-muted hover:text-brand-strong -mb-px inline-block border-b-2 border-transparent px-4 py-2.5 text-[14.5px] font-medium whitespace-nowrap transition-colors duration-150",
                  active && "border-brand text-brand-strong font-semibold",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
