"use client";

import { useActionState, useState } from "react";

import { saveWeeklySchedule } from "@/actions/schedules";
import {
  countSlots,
  formatTime12h,
  slotCountLabel,
  slotDurationLabel,
  SLOT_MINUTES_OPTIONS,
  TIME_OPTIONS,
  WEEKDAYS,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { ActionButton } from "./action-button";
import { ToggleSwitch } from "./toggle-switch";

export type WeekRow = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

const timeSelect =
  "border-line bg-surface text-ink focus-visible:border-brand min-h-9 rounded-lg border px-2.5 py-1.5 font-sans text-[13px] tabular-nums outline-none";

const durationSelect =
  "border-line bg-surface text-ink-muted focus-visible:border-brand cursor-pointer rounded-md border px-1.5 py-0.5 font-sans text-xs outline-none";

/**
 * The dropdowns run on a 15-minute grid. A row seeded from data that predates
 * this form (or was written straight to SQL) can sit off that grid, and a
 * <select> with no matching option silently reports the first one — which
 * would rewrite the doctor's hours on the next save. Keep the real value.
 */
function timeOptions(current: string) {
  if (TIME_OPTIONS.some((option) => option.value === current)) {
    return TIME_OPTIONS;
  }
  return [
    ...TIME_OPTIONS,
    { value: current, label: formatTime12h(current) },
  ].sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * The weekly timings panel.
 *
 * Rows are local state so the "15-min · 12 slots" read-out recomputes as the
 * doctor changes a time — countSlots() is the same helper the server action
 * validates with, so the number on screen is the number that gets saved.
 * The whole week posts in one submit, matching the reference's single
 * "Save timings" button.
 */
export function WeekScheduleForm({
  doctorClinicId,
  initialWeek,
}: {
  doctorClinicId: string;
  initialWeek: WeekRow[];
}) {
  const [state, formAction] = useActionState(
    saveWeeklySchedule.bind(null, doctorClinicId),
    undefined,
  );
  const [rows, setRows] = useState(initialWeek);

  function update(dayOfWeek: number, patch: Partial<WeekRow>) {
    setRows((previous) =>
      previous.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
      ),
    );
  }

  return (
    <form action={formAction} noValidate>
      {state?.formError && (
        <p
          role="alert"
          className="bg-danger-soft text-danger mb-3 rounded-lg px-3 py-2 text-[13px]"
        >
          {state.formError}
        </p>
      )}

      <div>
        {WEEKDAYS.map((day) => {
          const row = rows.find((entry) => entry.dayOfWeek === day.value);
          if (!row) return null;

          const slots = countSlots(row.startTime, row.endTime, row.slotMinutes);
          const dayError =
            state?.fieldErrors?.[`day-${day.value}-end`]?.[0] ??
            state?.fieldErrors?.[`day-${day.value}-start`]?.[0] ??
            state?.fieldErrors?.[`day-${day.value}-slot`]?.[0];

          return (
            <div
              key={day.value}
              className="border-line grid grid-cols-[42px_66px_1fr] items-center gap-3 border-b py-[11px] last:border-b-0"
            >
              <ToggleSwitch
                name={`day-${day.value}-enabled`}
                checked={row.enabled}
                onChange={(event) =>
                  update(day.value, { enabled: event.target.checked })
                }
                aria-label={`${day.long} hours`}
              />
              <span
                className={cn(
                  "text-sm font-semibold",
                  row.enabled ? "text-ink" : "text-ink-muted",
                )}
              >
                {day.short}
              </span>

              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 text-[13.5px]",
                  !row.enabled && "pointer-events-none opacity-40",
                )}
              >
                {!row.enabled && (
                  <span className="text-ink-muted text-[13px]">Off</span>
                )}

                {/* Kept mounted while closed so every weekday still posts a
                    complete row; hidden controls submit, disabled ones do not. */}
                <div
                  className={cn(
                    "flex flex-1 flex-wrap items-center gap-2",
                    !row.enabled && "hidden",
                  )}
                >
                  <select
                    name={`day-${day.value}-start`}
                    aria-label={`${day.long} start time`}
                    value={row.startTime}
                    onChange={(event) =>
                      update(day.value, { startTime: event.target.value })
                    }
                    className={timeSelect}
                  >
                    {timeOptions(row.startTime).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <span className="text-ink-muted">to</span>

                  <select
                    name={`day-${day.value}-end`}
                    aria-label={`${day.long} end time`}
                    value={row.endTime}
                    onChange={(event) =>
                      update(day.value, { endTime: event.target.value })
                    }
                    className={timeSelect}
                  >
                    {timeOptions(row.endTime).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <span className="text-ink-muted ml-auto flex items-center gap-1.5 text-xs">
                    <select
                      name={`day-${day.value}-slot`}
                      aria-label={`${day.long} slot length`}
                      value={row.slotMinutes}
                      onChange={(event) =>
                        update(day.value, {
                          slotMinutes: Number(event.target.value),
                        })
                      }
                      className={durationSelect}
                    >
                      {SLOT_MINUTES_OPTIONS.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {slotDurationLabel(minutes)}
                        </option>
                      ))}
                    </select>
                    <span aria-live="polite">
                      ·{" "}
                      {slots === 0
                        ? "End must be after start"
                        : slotCountLabel(slots)}
                    </span>
                  </span>
                </div>
              </div>

              {dayError && (
                <p
                  role="alert"
                  className="text-danger col-span-3 text-[12.5px]"
                >
                  {dayError}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {state?.notice && (
        <p className="bg-amber-soft mt-3 rounded-lg px-3 py-2 text-[13px] text-[#92500A]">
          {state.notice}
        </p>
      )}

      <div className="border-line mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3.5">
        <span className="text-ink-muted text-[12.5px]">
          Changes appear to patients instantly
        </span>
        <div className="flex items-center gap-3">
          {/* Keyed on the save timestamp so a second save remounts the element
              and replays the fade, without a timer in state. */}
          {state?.savedAt && (
            <span
              key={state.savedAt}
              aria-live="polite"
              className="text-success animate-save-flash text-[13px] font-semibold motion-reduce:animate-none"
            >
              ✓ Saved
            </span>
          )}
          <ActionButton>Save timings</ActionButton>
        </div>
      </div>
    </form>
  );
}
