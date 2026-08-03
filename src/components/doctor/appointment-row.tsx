"use client";

import { useActionState, useState } from "react";

import { updateAppointmentStatus } from "@/actions/appointments";
import { DOCTOR_ACTIONS, type AppointmentStatus } from "@/lib/appointments";
import { formatSlotTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { ActionButton } from "./action-button";
import { StatusBadge } from "./status-badge";
import { docBtnQuiet, docBtnSoft } from "./styles";

export type DoctorAppointment = {
  id: string;
  slot_start: string;
  slot_end: string;
  status: AppointmentStatus;
  patient_note: string | null;
  cancel_reason: string | null;
  patient: { full_name: string; phone: string | null } | null;
  isFirstVisit: boolean;
};

/**
 * One row of the appointment list.
 *
 * Every action on the row posts the same form; the target status rides along
 * as the pressed button's value, so a single useActionState covers all of
 * them. Cancelling is the one two-step action — it reveals a reason field
 * rather than firing immediately, because cancel_reason is shown to the
 * patient and there is no Dialog component in this project.
 */
export function AppointmentRow({
  appointment,
}: {
  appointment: DoctorAppointment;
}) {
  const [state, formAction] = useActionState(
    updateAppointmentStatus.bind(null, appointment.id),
    undefined,
  );
  const [askReason, setAskReason] = useState(false);

  const actions = DOCTOR_ACTIONS[appointment.status];
  const durationMinutes = Math.round(
    (new Date(appointment.slot_end).getTime() -
      new Date(appointment.slot_start).getTime()) /
      60_000,
  );

  return (
    <form
      action={formAction}
      className="bg-surface border-line grid grid-cols-[88px_1fr_auto] items-center gap-[14px] rounded-xl border px-4 py-3.5 max-[860px]:grid-cols-[72px_1fr]"
    >
      <div className="border-line border-r pr-3 text-center tabular-nums">
        <div className="text-ink text-base font-semibold">
          {formatSlotTime(appointment.slot_start)}
        </div>
        <div className="text-ink-muted text-xs">{durationMinutes} min</div>
      </div>

      <div>
        <div className="text-ink text-[15px] font-semibold">
          {appointment.patient?.full_name ?? "Patient"}
        </div>
        <div className="text-ink-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-[3px] text-[13px]">
          {appointment.patient?.phone && (
            <span>{appointment.patient.phone}</span>
          )}
          <span>{appointment.isFirstVisit ? "First visit" : "Follow-up"}</span>
        </div>
        {appointment.patient_note && (
          <div className="text-ink-muted bg-surface-dim mt-1.5 inline-block rounded-lg px-2.5 py-[5px] text-[12.5px]">
            Note: &ldquo;{appointment.patient_note}&rdquo;
          </div>
        )}
        {appointment.status === "cancelled" && appointment.cancel_reason && (
          <div className="text-ink-muted mt-1.5 text-[13px]">
            Cancelled &mdash; &ldquo;{appointment.cancel_reason}&rdquo;
          </div>
        )}
      </div>

      <div className="max-[860px]:border-line flex flex-wrap items-center justify-end gap-2 max-[860px]:col-span-full max-[860px]:justify-start max-[860px]:border-t max-[860px]:pt-2.5">
        <StatusBadge status={appointment.status} />
        {!askReason &&
          actions.map((action) =>
            action.status === "cancelled" ? (
              <button
                key={action.status}
                type="button"
                onClick={() => setAskReason(true)}
                className={docBtnQuiet}
              >
                {action.label}
              </button>
            ) : (
              <ActionButton
                key={action.status}
                name="next"
                value={action.status}
                tone={action.tone}
              >
                {action.label}
              </ActionButton>
            ),
          )}
      </div>

      {/* Collapses on its own once the row reaches a terminal status. */}
      {askReason && actions.length > 0 && (
        <div className="border-line col-span-full grid gap-2 border-t pt-3">
          <label
            htmlFor={`reason-${appointment.id}`}
            className="text-ink text-[13px] font-medium"
          >
            Why is this visit being cancelled? The patient will see this.
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`reason-${appointment.id}`}
              name="cancelReason"
              maxLength={200}
              placeholder="Optional — for example, clinic closed for an emergency"
              className="border-line focus-visible:border-brand text-ink min-h-11 min-w-48 flex-1 rounded-xl border px-3 text-base outline-none md:text-sm"
            />
            <ActionButton name="next" value="cancelled" tone="quiet">
              Cancel visit
            </ActionButton>
            <button
              type="button"
              onClick={() => setAskReason(false)}
              className={cn(docBtnSoft)}
            >
              Keep
            </button>
          </div>
        </div>
      )}

      {(state?.formError || state?.fieldErrors?.cancelReason) && (
        <p role="alert" className="text-danger col-span-full text-[13px]">
          {state.formError ?? state.fieldErrors?.cancelReason?.[0]}
        </p>
      )}
    </form>
  );
}
