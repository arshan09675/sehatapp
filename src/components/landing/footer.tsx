import Link from "next/link";

import { cn } from "@/lib/utils";
import { container } from "./styles";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-glass-line relative z-[2] border-t bg-[#070A14] pt-10 pb-[50px]">
      <div
        className={cn(
          container,
          "text-muted-dark flex flex-wrap items-center justify-between gap-5 text-sm",
        )}
      >
        <div>
          <Logo className="text-[19px]" />
          <span className="ml-2.5">© 2026 · Built in Lahore</span>
        </div>
        <div className="flex flex-wrap gap-[22px]">
          <Link href="/login" className="hover:text-white">
            For Doctors
          </Link>
          {/* TODO(Phase 6): real privacy policy and terms pages */}
          <a href="#" className="hover:text-white">
            Privacy
          </a>
          <a href="#" className="hover:text-white">
            Terms
          </a>
          <a href="#" className="hover:text-white">
            Emergency? Call 1122
          </a>
        </div>
      </div>
    </footer>
  );
}
