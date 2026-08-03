"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { addLeaveDay, removeLeaveDay } from "@/actions/schedules";
import { formatLeaveDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { ActionButton } from "./action-button";
import { docBtnQuiet, docBtnSoft } from "./styles";

export type LeaveDay = {
  id: string;
  on_date: string;
  reason: string | null;
};

const field =
  "border-line bg-surface text-ink focus-visible:border-brand min-h-11 w-full rounded-xl border px-3 text-base outline-none md:text-sm";

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-danger outline-brand min-h-8 flex-none cursor-pointer rounded-md px-1.5 text-[12.5px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

function LeaveRow({ leave }: { leave: LeaveDay }) {
  const [state, formAction] = useActionState(
    removeLeaveDay.bind(null, leave.id),
    undefined,
  );

  return (
    <form
      action={formAction}
      className="bg-surface-dim mb-2.5 flex items-center justify-between gap-2.5 rounded-[11px] px-3.5 py-2.5 text-[13.5px]"
    >
      <div>
        <div className="text-ink font-semibold">
          {formatLeaveDate(leave.on_date)}
        </div>
        <div className="text-ink-muted text-[12.5px]">
          {leave.reason ?? "Full day leave"}
        </div>
        {state?.formError && (
          <p role="alert" className="text-danger mt-1 text-[12.5px]">
            {state.formError}
          </p>
        )}
      </div>
      <RemoveButton />
    </form>
  );
}

/**
 * Leave days for one clinic.
 *
 * Full-day closures only: book_appointment reads a schedule_exception but acts
 * on is_closed alone, so custom hours would be a control that silently does
 * nothing to bookings. They arrive in Phase 4 with the booking flow.
 */
export function LeavePanel({
  doctorClinicId,
  leaveDays,
  minDate,
}: {
  doctorClinicId: string;
  leaveDays: LeaveDay[];
  /** Today in Karachi — the earliest date worth blocking. */
  minDate: string;
}) {
  const [state, formAction] = useActionState(
    addLeaveDay.bind(null, doctorClinicId),
    undefined,
  );
  // The form stays open while the save timestamp is unchanged from when it was
  // opened; a successful add bumps savedAt and the form closes. Derived from
  // the action state rather than toggled in an effect, and independent of any
  // clock skew between the browser and the server.
  const [openedAt, setOpenedAt] = useState<{ savedAt?: number } | null>(null);
  const adding = openedAt !== null && openedAt.savedAt === state?.savedAt;

  return (
    <div>
      {leaveDays.length === 0 && !adding && (
        <p className="text-ink-muted mb-3 text-[13px]">
          No leave days booked. Block a date and those slots close to patients
          straight away.
        </p>
      )}

      {leaveDays.map((leave) => (
        <LeaveRow key={leave.id} leave={leave} />
      ))}

      {adding ? (
        <form
          action={formAction}
          noValidate
          className="border-line grid gap-2 rounded-[11px] border border-dashed p-3"
        >
          <div className="grid gap-1.5">
            <label
              htmlFor="onDate"
              className="text-ink text-[13px] font-semibold"
            >
              Date
            </label>
            <input
              id="onDate"
              name="onDate"
              type="date"
              required
              min={minDate}
              aria-invalid={!!state?.fieldErrors?.onDate || undefined}
              className={field}
            />
            {state?.fieldErrors?.onDate && (
              <p role="alert" className="text-danger text-xs">
                {state.fieldErrors.onDate[0]}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="reason"
              className="text-ink text-[13px] font-semibold"
            >
              Reason{" "}
              <span className="text-ink-muted font-normal">optional</span>
            </label>
            <input
              id="reason"
              name="reason"
              maxLength={160}
              placeholder="Conference — full day leave"
              className={field}
            />
            {state?.fieldErrors?.reason && (
              <p role="alert" className="text-danger text-xs">
                {state.fieldErrors.reason[0]}
              </p>
            )}
          </div>

          {state?.formError && (
            <p
              role="alert"
              className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-[13px]"
            >
              {state.formError}
            </p>
          )}

          <div className="flex gap-2">
            <ActionButton tone="soft" className="flex-1">
              Add leave day
            </ActionButton>
            <button
              type="button"
              onClick={() => setOpenedAt(null)}
              className={docBtnQuiet}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpenedAt({ savedAt: state?.savedAt })}
          className={cn(docBtnSoft, "w-full")}
        >
          + Add leave day
        </button>
      )}
    </div>
  );
}
