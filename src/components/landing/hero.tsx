import Link from "next/link";

import { cn } from "@/lib/utils";
import { CalendarIcon, RupeeIcon, SearchIcon, ShieldCheckIcon } from "./icons";
import { btn, btnGlass, btnPrimary, container } from "./styles";

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-74px)] items-center pt-10 pb-[70px] max-[860px]:min-h-0 max-[860px]:pt-[30px] max-[860px]:pb-[90px]">
      <div className={container}>
        <div className="max-w-[700px]">
          <span className="border-glass-line bg-glass text-ink-light mb-[26px] inline-flex items-center gap-[9px] rounded-full border px-4 py-[7px] text-[13px] font-medium backdrop-blur-[12px]">
            <span className="animate-pulse-dot size-2 rounded-full bg-[#5B8CFF]" />
            PMC-verified doctors · Now live in Lahore
          </span>
          <h1 className="font-heading mb-[18px] text-[clamp(40px,6.2vw,72px)] leading-[1.06] font-bold tracking-[-0.01em] text-white">
            Healthcare,
            <br />
            <em className="bg-[linear-gradient(120deg,#8FC0FF,#6E8CFF_52%,#A78BFA)] bg-clip-text font-semibold text-transparent italic">
              one click
            </em>{" "}
            away.
          </h1>
          <p className="text-muted-dark mb-[34px] max-w-[560px] text-[clamp(16px,2.4vw,20px)] leading-[1.6]">
            Book verified doctors in seconds. Transparent fees, real
            availability, and instant confirmation — the trust of a great
            hospital, online.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#doctors" className={cn(btn, btnPrimary)}>
              <SearchIcon className="size-[18px]" />
              Find a doctor
            </a>
            <Link href="/login" className={cn(btn, btnGlass)}>
              For doctors →
            </Link>
          </div>
          <div className="text-muted-dark mt-9 flex flex-wrap gap-[22px] text-sm">
            <span className="inline-flex items-center gap-2">
              <ShieldCheckIcon
                className="size-[18px] text-[#7CA0FF]"
                strokeWidth={2}
              />{" "}
              Every doctor PMC-verified
            </span>
            <span className="inline-flex items-center gap-2">
              <RupeeIcon className="size-[18px] text-[#7CA0FF]" /> Fees shown
              upfront
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarIcon className="size-[18px] text-[#7CA0FF]" /> Booking is
              always free
            </span>
          </div>
        </div>
      </div>
      <div className="text-muted-dark absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-xs tracking-[.1em] max-[860px]:hidden">
        <div className="border-glass-line relative h-[34px] w-[22px] rounded-xl border-2">
          <span className="animate-scroll-cue absolute top-[6px] left-1/2 h-[6px] w-[3px] -translate-x-1/2 rounded-[2px] bg-[#7CA0FF]" />
        </div>
        SCROLL
      </div>
    </section>
  );
}
