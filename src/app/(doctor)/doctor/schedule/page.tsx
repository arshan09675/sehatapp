import type { Metadata } from "next";

import {
  ClinicPicker,
  type ClinicOption,
} from "@/components/doctor/clinic-picker";
import { LeavePanel, type LeaveDay } from "@/components/doctor/leave-panel";
import {
  docCard,
  docPanelHint,
  docPanelTitle,
} from "@/components/doctor/styles";
import {
  WeekScheduleForm,
  type WeekRow,
} from "@/components/doctor/week-schedule-form";
import { requireDoctor } from "@/lib/auth/dal";
import { karachiDateKey } from "@/lib/datetime";
import {
  DEFAULT_END_TIME,
  DEFAULT_SLOT_MINUTES,
  DEFAULT_START_TIME,
  WEEKDAYS,
} from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Schedule — Doctor — SehatBook",
};

type ClinicRow = { id: string; name: string; area: string; city: string };

export default async function DoctorSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ clinic?: string }>;
}) {
  const { doctor } = await requireDoctor();
  const { clinic } = await searchParams;

  const supabase = await createClient();
  const { data: associations, error } = await supabase
    .from("doctor_clinics")
    .select("id, fee_pkr, clinic:clinics(id, name, area, city)")
    .eq("doctor_id", doctor.id);

  if (error) throw new Error("Failed to load your clinics");

  if (!associations || associations.length === 0) {
    return (
      <section>
        <h1 className="font-heading text-ink mb-4 text-xl font-semibold">
          Schedule
        </h1>
        <div className="border-line grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="text-ink font-medium">No clinics yet</p>
          <p className="text-ink-muted text-sm">
            Timings are set per clinic. An administrator assigns you to a clinic
            first — contact your SehatBook admin to get set up.
          </p>
        </div>
      </section>
    );
  }

  const options: ClinicOption[] = associations.map((association) => {
    const row = (
      Array.isArray(association.clinic)
        ? association.clinic[0]
        : association.clinic
    ) as ClinicRow;
    return {
      doctorClinicId: association.id,
      label: `${row.name} — ${row.area} · Rs. ${association.fee_pkr.toLocaleString("en-PK")}`,
    };
  });

  const selected =
    options.find((option) => option.doctorClinicId === clinic) ?? options[0];
  const todayKey = karachiDateKey();

  const [schedules, exceptions] = await Promise.all([
    supabase
      .from("schedules")
      .select("day_of_week, start_time, end_time, slot_minutes")
      .eq("doctor_clinic_id", selected.doctorClinicId),
    supabase
      .from("schedule_exceptions")
      .select("id, on_date, reason")
      .eq("doctor_clinic_id", selected.doctorClinicId)
      .eq("is_closed", true)
      .gte("on_date", todayKey)
      .order("on_date", { ascending: true }),
  ]);

  if (schedules.error || exceptions.error) {
    throw new Error("Failed to load your schedule");
  }

  const saved = schedules.data ?? [];
  const initialWeek: WeekRow[] = WEEKDAYS.map((day) => {
    const row = saved.find((entry) => entry.day_of_week === day.value);
    if (!row) {
      return {
        dayOfWeek: day.value,
        enabled: false,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        slotMinutes: DEFAULT_SLOT_MINUTES,
      };
    }
    return {
      dayOfWeek: day.value,
      enabled: true,
      // Postgres `time` comes back as "15:00:00"; the controls use "HH:MM".
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      slotMinutes: row.slot_minutes,
    };
  });

  const leaveDays: LeaveDay[] = (exceptions.data ?? []).map((exception) => ({
    id: exception.id,
    on_date: exception.on_date,
    reason: exception.reason,
  }));

  return (
    <section>
      <h1 className="sr-only">Schedule</h1>
      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-[18px] max-[860px]:grid-cols-1">
        <div className={cn(docCard, "p-5")}>
          <h2 className={docPanelTitle}>Weekly timings</h2>
          <p className={docPanelHint}>
            Set clinic hours per day — slots are generated automatically from
            the slot duration.
          </p>

          <ClinicPicker options={options} selected={selected.doctorClinicId} />

          {/* Keyed so switching clinics resets the form's local row state
              instead of carrying the previous clinic's hours across. */}
          <WeekScheduleForm
            key={selected.doctorClinicId}
            doctorClinicId={selected.doctorClinicId}
            initialWeek={initialWeek}
          />
        </div>

        <div className={cn(docCard, "p-5")}>
          <h2 className={docPanelTitle}>Leave &amp; exceptions</h2>
          <p className={docPanelHint}>
            Block a date and those slots close to patients straight away.
          </p>
          <LeavePanel
            key={selected.doctorClinicId}
            doctorClinicId={selected.doctorClinicId}
            leaveDays={leaveDays}
            minDate={todayKey}
          />
        </div>
      </div>
    </section>
  );
}
