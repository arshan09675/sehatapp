// Landing-only button/layout class recipes, ported 1:1 from the reference's
// .btn / .container rules. The shadcn Button deliberately isn't used here —
// these pixel-match the marketing design (gradient fill, glass, 48px targets).

export const container = "mx-auto w-full max-w-[1140px] px-[22px]";

export const btn =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-[9px] rounded-[14px] border-none px-6 font-sans text-[15px] font-semibold transition-[transform,background,box-shadow] duration-[180ms] ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0";

export const btnPrimary =
  "bg-[linear-gradient(180deg,#3B6BF0,var(--brand))] text-white shadow-[0_10px_28px_rgba(43,89,224,.4)] hover:shadow-[0_16px_38px_rgba(43,89,224,.52)]";

export const btnGlass =
  "border border-solid border-glass-line bg-glass text-white backdrop-blur-[12px] hover:bg-[rgba(255,255,255,.13)]";

export const btnGhost = "bg-transparent text-ink-light hover:bg-glass";

export const btnSm = "min-h-[38px] rounded-[11px] px-[15px] text-[13.5px]";
