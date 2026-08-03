"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { cancelAppointment } from "@/actions/booking";
import { StatusBadge } from "@/components/doctor/status-badge";
import { docBtnQuiet, docBtnSoft } from "@/components/doctor/styles";
import type { AppointmentStatus } from "@/lib/appointments";
import { formatAppointmentWhen } from "@/lib/datetime";
import { formatFee } from "@/lib/doctor-display";
import { cn } from "@/lib/utils";

export type PatientAppointment = {
  id: string;
  slotStart: string;
  status: AppointmentStatus;
  feePkr: number;
  patientNote: string | null;
  cancelReason: string | null;
  doctor: { id: string; fullName: string; specialty: string } | null;
  clinic: { name: string; area: string; city: string; address: string } | null;
};

/** Only a visit that has not happened yet can be called off. */
export function isCancellable(
  appointment: PatientAppointment,
  now: Date,
): boolean {
  return (
    (appointment.status === "pending" || appointment.status === "confirmed") &&
    new Date(appointment.slotStart).getTime() > now.getTime()
  );
}

export function AppointmentCard({
  appointment,
  cancellable,
}: {
  appointment: PatientAppointment;
  cancellable: boolean;
}) {
  const [state, formAction] = useActionState(
    cancelAppointment.bind(null, appointment.id),
    undefined,
  );
  const [asking, setAsking] = useState(false);

  return (
    <form
      action={formAction}
      className="bg-surface border-line grid grid-cols-[1fr_auto] items-start gap-3 rounded-xl border px-4 py-3.5 max-[640px]:grid-cols-1"
    >
      <div>
        <div className="text-ink text-[15px] font-semibold">
          {appointment.doctor?.fullName ?? "Doctor"}
        </div>
        <div className="text-ink-muted mt-0.5 text-[13px]">
          {appointment.doctor?.specialty}
          {appointment.clinic &&
            ` · ${appointment.clinic.name}, ${appointment.clinic.area}`}
        </div>
        <div className="text-ink mt-1.5 text-sm font-medium tabular-nums">
          {formatAppointmentWhen(appointment.slotStart)}
        </div>
        {appointment.patientNote && (
          <div className="text-ink-muted bg-surface-dim mt-1.5 inline-block rounded-lg px-2.5 py-[5px] text-[12.5px]">
            Your note: &ldquo;{appointment.patientNote}&rdquo;
          </div>
        )}
        {appointment.status === "cancelled" && appointment.cancelReason && (
          <div className="text-ink-muted mt-1.5 text-[13px]">
            Cancelled &mdash; &ldquo;{appointment.cancelReason}&rdquo;
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 max-[640px]:flex-row max-[640px]:items-center">
        <StatusBadge status={appointment.status} />
        <span className="text-ink text-sm font-semibold tabular-nums">
          {formatFee(appointment.feePkr)}
        </span>
        {cancellable && !asking && (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className={cn(docBtnQuiet, "min-h-9 px-3 text-[13px]")}
          >
            Cancel
          </button>
        )}
        {appointment.status === "completed" && appointment.doctor && (
          <Link
            href={`/doctors/${appointment.doctor.id}`}
            className={cn(docBtnSoft, "min-h-9 px-3 text-[13px]")}
          >
            Book again
          </Link>
        )}
      </div>

      {asking && cancellable && (
        <div className="border-line col-span-full grid gap-2 border-t pt-3">
          <label
            htmlFor={`reason-${appointment.id}`}
            className="text-ink text-[13px] font-medium"
          >
            Why are you cancelling? The clinic will see this.
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`reason-${appointment.id}`}
              name="cancelReason"
              maxLength={200}
              placeholder="Optional — for example, out of town"
              className="border-line focus-visible:border-brand text-ink min-h-11 min-w-48 flex-1 rounded-xl border px-3 text-base outline-none md:text-sm"
            />
            <button type="submit" className={cn(docBtnQuiet, "min-h-11")}>
              Cancel visit
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className={cn(docBtnSoft, "min-h-11")}
            >
              Keep it
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
