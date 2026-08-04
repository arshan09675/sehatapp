"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "./icons";

/**
 * One question/answer disclosure.
 *
 * State lives on the row rather than on the list, which keeps the client
 * boundary as small as the brief asks — the section, its heading and every
 * answer string stay server-rendered. It also means opening a second question
 * doesn't snap the first one shut while you're still reading it.
 *
 * Collapsed panels are `inert`: the copy is present in the HTML (good for
 * search engines) but out of the tab order and the accessibility tree, so a
 * screen reader never reads an answer whose button says `aria-expanded=false`.
 */
export function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const buttonId = `${id}-q`;
  const panelId = `${id}-a`;

  return (
    <div className="border-line border-t first:border-t-0">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="focus-visible:outline-brand text-ink flex w-full cursor-pointer items-center justify-between gap-5 py-[18px] text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="font-heading text-lg font-semibold tracking-[-0.01em]">
            {question}
          </span>
          <ChevronDownIcon
            className={cn(
              "text-brand size-5 flex-none transition-transform duration-200 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>

      {/* 0fr → 1fr animates to the panel's natural height without measuring it
          or hardcoding one, so answers can be any length. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-[260ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="text-ink-muted max-w-[68ch] pr-10 pb-[18px] text-[14.5px] leading-[1.6]">
            {children}
          </p>
        </div>
      </div>
    </div>
  );
}
