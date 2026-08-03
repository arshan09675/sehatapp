import Link from "next/link";

import { cn } from "@/lib/utils";
import { btn, btnGhost, btnPrimary, container } from "./styles";
import { Logo } from "./logo";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30">
      <div
        className={cn(
          container,
          "flex h-[74px] items-center justify-between gap-4",
        )}
      >
        <Logo />
        {/* Absolute paths so the bar works on /doctors too, not just the
            landing where the anchors live. */}
        <nav className="flex gap-[26px] text-[15px] font-medium max-[860px]:hidden">
          <Link href="/doctors" className="text-muted-dark hover:text-white">
            Find a Doctor
          </Link>
          <Link href="/#how" className="text-muted-dark hover:text-white">
            How it works
          </Link>
          <Link href="/login" className="text-muted-dark hover:text-white">
            For Doctors
          </Link>
        </nav>
        <div className="flex gap-2.5">
          <Link href="/login" className={cn(btn, btnGhost, "min-h-11")}>
            Log in
          </Link>
          <Link href="/signup" className={cn(btn, btnPrimary, "min-h-11 px-5")}>
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
