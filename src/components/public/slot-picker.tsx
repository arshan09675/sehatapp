"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { bookAppointment } from "@/actions/booking";
import { btn, btnPrimary } from "@/components/landing/styles";
import { cn } from "@/lib/utils";

/** Serialisable slot — Dates are flattened to ISO before crossing to the client. */
export type PickerSlot = {
  iso: string;
  label: string;
  taken: boolean;
};

export type PickerDay = {
  dateKey: string;
  /** "Today" / "Tomorrow" / "Wed". */
  tabLine1: string;
  /** "Mon 3 Aug" / "5 Aug". */
  tabLine2: string;
  /** How the day reads in the CTA: "today", "Tue 4 Aug". */
  bookLabel: string;
  closed: boolean;
  slots: PickerSlot[];
};

function BookButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        btn,
        btnPrimary,
        "mt-[18px] min-h-[52px] w-full text-base",
        "disabled:cursor-not-allowed disabled:bg-[#C3CCE0] disabled:bg-none disabled:text-white disabled:shadow-none disabled:hover:translate-y-0",
      )}
    >
      {pending ? "Booking…" : label}
    </button>
  );
}

/**
 * The public slot picker.
 *
 * Slots arrive fully resolved from the server — schedules minus leave days
 * minus taken times, all computed by buildAvailability() on top of
 * schedule.ts's grid rule, the same one book_appointment validates against.
 * Nothing is generated here.
 *
 * `mode="link"` is for the landing, where the CTA sends the visitor to the
 * doctor's page with the slot preselected instead of booking in place.
 */
export function SlotPicker({
  doctorId,
  clinicId,
  days,
  initialSlotIso,
  mode = "book",
}: {
  doctorId: string;
  clinicId: string;
  days: PickerDay[];
  initialSlotIso?: string;
  mode?: "book" | "link";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    bookAppointment.bind(null, doctorId, clinicId),
    undefined,
  );

  // A slot resumed from ?slot= decides which day opens.
  const resumedDay = days.findIndex((day) =>
    day.slots.some((slot) => slot.iso === initialSlotIso && !slot.taken),
  );
  const [dayIndex, setDayIndex] = useState(resumedDay >= 0 ? resumedDay : 0);
  const [selected, setSelected] = useState<string | null>(
    resumedDay >= 0 ? (initialSlotIso ?? null) : null,
  );

  const day = days[dayIndex];
  const chosen = day?.slots.find((slot) => slot.iso === selected) ?? null;

  function switchDay(index: number) {
    setDayIndex(index);
    // The reference clears the selection on every day switch.
    setSelected(null);
  }

  const ctaLabel = chosen
    ? `Book for ${day.bookLabel} · ${chosen.label}`
    : "Select a time slot";

  return (
    <form action={formAction}>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {days.map((entry, index) => (
          <button
            key={entry.dateKey}
            type="button"
            role="tab"
            aria-selected={index === dayIndex}
            onClick={() => switchDay(index)}
            className={cn(
              "border-line bg-surface min-h-[46px] min-w-[92px] cursor-pointer rounded-[11px] border px-3.5 py-2 text-center transition-colors duration-150",
              index === dayIndex && "border-brand bg-brand-soft",
            )}
          >
            <div
              className={cn(
                "text-ink text-[13px] font-semibold",
                index === dayIndex && "text-brand-strong",
              )}
            >
              {entry.tabLine1}
            </div>
            <div className="text-ink-muted text-xs">{entry.tabLine2}</div>
          </button>
        ))}
      </div>

      {!day || day.closed || day.slots.length === 0 ? (
        <p className="border-line text-ink-muted rounded-xl border border-dashed px-4 py-10 text-center text-sm">
          {day?.closed
            ? "The doctor is on leave this day."
            : "No slots left on this day. Try another date."}
        </p>
      ) : (
        <div
          // Remounting on day change replays the reference's rise animation.
          key={day.dateKey}
          className="animate-rise grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-[9px] motion-reduce:animate-none"
        >
          {day.slots.map((slot) => (
            <button
              key={slot.iso}
              type="button"
              disabled={slot.taken}
              aria-pressed={selected === slot.iso}
              onClick={() => setSelected(slot.iso)}
              className={cn(
                "border-line bg-surface text-ink hover:enabled:border-brand inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-full border text-sm font-medium tabular-nums transition-colors duration-150",
                selected === slot.iso &&
                  "border-brand bg-brand-soft text-brand-strong font-semibold",
                slot.taken &&
                  "bg-surface-dim cursor-not-allowed border-transparent text-[#A9B2C3] line-through",
              )}
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}

      <div className="text-ink-muted mt-3.5 flex flex-wrap gap-[18px] text-[12.5px]">
        <span>
          <i className="border-brand bg-brand-soft mr-1.5 inline-block size-3 rounded-[4px] border align-[-1px]" />
          Selected
        </span>
        <span>
          <i className="border-line bg-surface mr-1.5 inline-block size-3 rounded-[4px] border align-[-1px]" />
          Available
        </span>
        <span>
          <i className="bg-surface-dim mr-1.5 inline-block size-3 rounded-[4px] align-[-1px]" />
          Booked
        </span>
      </div>

      {mode === "book" && chosen && (
        <div className="mt-4 grid gap-1.5">
          <label
            htmlFor="patientNote"
            className="text-ink text-[13px] font-semibold"
          >
            Anything the doctor should know?{" "}
            <span className="text-ink-muted font-normal">optional</span>
          </label>
          <input
            id="patientNote"
            name="patientNote"
            maxLength={500}
            placeholder="For example, a symptom or a follow-up reference"
            className="border-line bg-surface text-ink focus-visible:border-brand min-h-11 w-full rounded-xl border px-3 text-base outline-none md:text-sm"
          />
        </div>
      )}

      {state?.formError && (
        <div
          role="alert"
          className="bg-danger-soft text-danger mt-4 rounded-lg px-3 py-2.5 text-sm"
        >
          {state.formError}
          {state.slotTaken && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="ml-2 font-semibold underline underline-offset-2"
            >
              Refresh slots
            </button>
          )}
        </div>
      )}

      {mode === "book" ? (
        <>
          <input type="hidden" name="slotStart" value={selected ?? ""} />
          {chosen ? (
            <BookButton label={ctaLabel} />
          ) : (
            <button
              type="button"
              disabled
              className={cn(
                btn,
                "mt-[18px] min-h-[52px] w-full cursor-not-allowed bg-[#C3CCE0] text-base text-white hover:translate-y-0",
              )}
            >
              Select a time slot
            </button>
          )}
        </>
      ) : chosen ? (
        <Link
          href={`/doctors/${doctorId}?clinic=${clinicId}&slot=${encodeURIComponent(chosen.iso)}`}
          className={cn(
            btn,
            btnPrimary,
            "mt-[18px] min-h-[52px] w-full text-base",
          )}
        >
          {ctaLabel}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={cn(
            btn,
            "mt-[18px] min-h-[52px] w-full cursor-not-allowed bg-[#C3CCE0] text-base text-white hover:translate-y-0",
          )}
        >
          Select a time slot
        </button>
      )}
    </form>
  );
}
