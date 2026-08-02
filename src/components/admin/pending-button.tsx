"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Submit button for server-action forms: shows a spinner while the action
 * runs and can ask for confirmation before submitting (destructive or
 * hard-to-undo actions). Must be rendered INSIDE the <form>.
 */
export function PendingButton({
  children,
  confirmMessage,
  disabled,
  ...buttonProps
}: React.ComponentProps<typeof Button> & { confirmMessage?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      onClick={
        confirmMessage
          ? (event) => {
              if (!window.confirm(confirmMessage)) event.preventDefault();
            }
          : undefined
      }
      {...buttonProps}
    >
      {pending && <Spinner />}
      {children}
    </Button>
  );
}
