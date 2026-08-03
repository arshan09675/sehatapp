"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { slotDays } from "./data";
import { DocTop } from "./doctor-card";
import { CardIcon } from "./icons";
import { Reveal } from "./reveal";
import { btn, btnPrimary } from "./styles";

/**
 * Interactive slot-picker demo, ported from the reference. Purely a marketing
 * demo against static data.
 * TODO(Phase 4): replace with the real booking flow — live slots generated
 * from schedules minus exceptions minus booked appointments, booking via the
 * book_appointment RPC.
 */
export function SlotPickerDemo() {
  const [dayKey, setDayKey] = useState(slotDays[0].key);
  const [selected, setSelected] = useState<string | null>(null);
  const [reserved, setReserved] = useState(false);
  // Bumped on reset so the slot grid's rise animation replays, as in the reference.
  const [gridEpoch, setGridEpoch] = useState(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const day = slotDays.find((d) => d.key === dayKey) ?? slotDays[0];

  function switchDay(key: string) {
    setDayKey(key);
    setSelected(null);
    setGridEpoch((n) => n + 1);
  }

  function book() {
    if (!selected || reserved) return;
    setReserved(true);
    resetTimer.current = setTimeout(() => {
      setReserved(false);
      setSelected(null);
      setGridEpoch((n) => n + 1);
    }, 2200);
  }

  return (
    <div className="grid grid-cols-[1fr_1.25fr] items-start gap-[18px] max-[860px]:grid-cols-1">
      <Reveal>
        <div className="bg-surface shadow-card rounded-2xl p-6">
          <DocTop
            initials="AS"
            name="Dr. Ayesha Siddiqui"
            meta="Dermatologist · MBBS, FCPS"
            clinic="Hameed Latif Hospital, Garden Town"
          />
          <div className="bg-surface-dim mt-4 flex items-center justify-between rounded-[11px] px-4 py-3 text-[14.5px]">
            <span>Consultation fee</span>
            <strong className="tabular-nums">Rs. 1,500</strong>
          </div>
          <p className="text-ink-muted mt-2.5 flex items-center gap-[7px] text-[13px]">
            <CardIcon className="size-[15px] flex-none" /> Pay at the clinic —
            no online payment required
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="bg-surface shadow-card rounded-2xl p-6">
          <div className="mb-4 flex flex-wrap gap-2" role="tablist">
            {slotDays.map((d) => (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={d.key === dayKey}
                onClick={() => switchDay(d.key)}
                className={cn(
                  "border-line bg-surface min-h-[46px] min-w-[92px] cursor-pointer rounded-[11px] border px-3.5 py-2 text-center transition-colors duration-150",
                  d.key === dayKey && "border-brand bg-brand-soft",
                )}
              >
                <div
                  className={cn(
                    "text-ink text-[13px] font-semibold",
                    d.key === dayKey && "text-brand-strong",
                  )}
                >
                  {d.tabLine1}
                </div>
                <div className="text-ink-muted text-xs">{d.tabLine2}</div>
              </button>
            ))}
          </div>

          <div
            key={`${dayKey}-${gridEpoch}`}
            className="animate-rise grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-[9px] motion-reduce:animate-none"
          >
            {day.slots.map((slot) => (
              <button
                key={slot.t}
                type="button"
                disabled={slot.booked}
                onClick={() => setSelected(slot.t)}
                className={cn(
                  "border-line bg-surface text-ink hover:enabled:border-brand inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-full border text-sm font-medium tabular-nums transition-colors duration-150",
                  selected === slot.t &&
                    "border-brand bg-brand-soft text-brand-strong font-semibold",
                  slot.booked &&
                    "bg-surface-dim cursor-not-allowed border-transparent text-[#A9B2C3] line-through",
                )}
              >
                {slot.t}
              </button>
            ))}
          </div>

          <div className="text-ink-muted mt-3.5 flex gap-[18px] text-[12.5px]">
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

          <button
            type="button"
            disabled={!selected && !reserved}
            onClick={book}
            className={cn(
              btn,
              "mt-[18px] min-h-[52px] w-full text-base",
              reserved
                ? "bg-success bg-none text-white shadow-none"
                : btnPrimary,
              "disabled:cursor-not-allowed disabled:bg-[#C3CCE0] disabled:bg-none disabled:text-white disabled:shadow-none disabled:hover:translate-y-0",
            )}
          >
            {reserved
              ? "✓ Slot reserved — log in to confirm"
              : selected
                ? `Book for ${day.bookLabel} · ${selected}`
                : "Select a time slot"}
          </button>
        </div>
      </Reveal>
    </div>
  );
}
