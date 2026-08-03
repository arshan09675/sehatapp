"use client";

import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { docBtnPrimary, docBtnQuiet, docBtnSoft } from "./styles";

const TONES = {
  primary: docBtnPrimary,
  quiet: docBtnQuiet,
  soft: docBtnSoft,
};

/**
 * Submit button for the dashboard's server-action forms — the doctor-area
 * counterpart of components/admin/pending-button.tsx, styled per DESIGN.md
 * instead of shadcn. Must be rendered inside the <form> it submits.
 */
export function ActionButton({
  tone = "primary",
  className,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> & { tone?: keyof typeof TONES }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(TONES[tone], className)}
      {...props}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
