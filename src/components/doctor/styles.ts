// Button/card recipes for the doctor dashboard.
//
// DESIGN.md rules for product surfaces override the #fordoc markup where they
// disagree: flat --brand fill (never the landing gradient), rounded-xl, and a
// 44px minimum target — the reference's inline min-height:34px row buttons are
// below that floor. The helpers in components/landing/styles.ts are marked
// landing-only and assume the dark hero background, so they are not reused
// here.

import { cn } from "@/lib/utils";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-150 outline-brand focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const docBtnPrimary = cn(
  base,
  "min-h-11 bg-brand text-white hover:bg-brand-strong",
);

/** Secondary row action — the reference's grey ghost. */
export const docBtnQuiet = cn(
  base,
  "min-h-11 bg-surface-dim text-ink-muted hover:bg-line hover:text-ink",
);

/** DESIGN.md's secondary button: brand-soft fill, brand-strong text. */
export const docBtnSoft = cn(
  base,
  "min-h-11 bg-brand-soft text-brand-strong hover:bg-brand/15",
);

export const docCard = "bg-surface shadow-card rounded-2xl";

/** Panel heading, e.g. "Weekly timings". */
export const docPanelTitle = "font-heading text-[17px] font-semibold text-ink";
export const docPanelHint = "text-ink-muted mb-4 text-[13px]";
