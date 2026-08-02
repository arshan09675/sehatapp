"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/clinics", label: "Clinics" },
  { href: "/admin/doctors", label: "Doctors" },
  { href: "/admin/verification", label: "Verification" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="border-border -mx-4 border-b px-4">
      <ul className="flex gap-1 overflow-x-auto text-sm">
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
                  "text-muted-foreground hover:text-foreground -mb-px inline-block border-b-2 border-transparent px-3 py-2.5 font-medium whitespace-nowrap transition-colors",
                  active && "border-primary text-foreground",
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
