import type { Metadata } from "next";

import {
  AppointmentRow,
  type DoctorAppointment,
} from "@/components/doctor/appointment-row";
import { StatCards } from "@/components/doctor/stat-cards";
import { TabPills } from "@/components/doctor/tab-pills";
import type { AppointmentStatus } from "@/lib/appointments";
import { requireDoctor } from "@/lib/auth/dal";
import {
  formatGreetingDate,
  karachiDateKey,
  karachiDayBounds,
  karachiGreeting,
  karachiWeekBounds,
} from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Appointments — Doctor — SehatBook",
};

const TAB_KEYS = ["today", "upcoming", "past"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const ROW_SELECT =
  "id, slot_start, slot_end, status, patient_note, cancel_reason, patient_id, patient:profiles!patient_id(full_name, phone)";

const EMPTY_COPY: Record<TabKey, { title: string; body: string }> = {
  today: {
    title: "Nothing booked today",
    body: "When patients book today's slots they appear here, newest first. Check your weekly timings if today should be open.",
  },
  upcoming: {
    title: "No upcoming appointments",
    body: "Bookings for future dates land here. Patients can only book days you have opened under Schedule.",
  },
  past: {
    title: "No past appointments yet",
    body: "Once a visit is completed or its time passes, it moves here as your record.",
  },
};

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { profile, doctor } = await requireDoctor();
  const { tab } = await searchParams;
  const active: TabKey = TAB_KEYS.includes(tab as TabKey)
    ? (tab as TabKey)
    : "today";

  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const today = karachiDayBounds(karachiDateKey(now));
  const week = karachiWeekBounds(now);

  // Half-open ranges per tab: today, everything after today, everything before.
  const range =
    active === "today"
      ? {
          from: today.start.toISOString(),
          to: today.end.toISOString(),
          ascending: true,
        }
      : active === "upcoming"
        ? { from: today.end.toISOString(), to: null, ascending: true }
        : { from: null, to: today.start.toISOString(), ascending: false };

  let rowsQuery = supabase
    .from("appointments")
    .select(ROW_SELECT)
    .eq("doctor_id", doctor.id);
  if (range.from) rowsQuery = rowsQuery.gte("slot_start", range.from);
  if (range.to) rowsQuery = rowsQuery.lt("slot_start", range.to);

  function baseCount() {
    return supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", doctor.id);
  }

  const [
    rowsResult,
    todayCount,
    upcomingCount,
    pendingCount,
    weekCount,
    clinics,
  ] = await Promise.all([
    rowsQuery.order("slot_start", { ascending: range.ascending }).limit(100),
    baseCount()
      .gte("slot_start", today.start.toISOString())
      .lt("slot_start", today.end.toISOString()),
    baseCount().gte("slot_start", today.end.toISOString()),
    baseCount().eq("status", "pending").gte("slot_start", nowIso),
    baseCount()
      .gte("slot_start", week.start.toISOString())
      .lt("slot_start", week.end.toISOString()),
    supabase
      .from("doctor_clinics")
      .select("clinic:clinics(name)")
      .eq("doctor_id", doctor.id)
      .limit(1),
  ]);

  if (rowsResult.error) {
    throw new Error("Failed to load appointments");
  }
  const rows = rowsResult.data ?? [];

  // "First visit" means no earlier non-cancelled appointment with this doctor.
  // One extra query bounded by the patients currently on screen.
  const patientIds = [...new Set(rows.map((row) => row.patient_id))];
  const history = patientIds.length
    ? ((
        await supabase
          .from("appointments")
          .select("patient_id, slot_start")
          .eq("doctor_id", doctor.id)
          .in("patient_id", patientIds)
          .neq("status", "cancelled")
      ).data ?? [])
    : [];

  const appointments: DoctorAppointment[] = rows.map((row) => {
    // PostgREST embeds arrive as an object for many-to-one, but the generated
    // types are not always confident about it.
    const embedded = row.patient as
      | { full_name: string; phone: string | null }
      | { full_name: string; phone: string | null }[]
      | null;
    const patient = Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;

    const startedAt = Date.parse(row.slot_start);
    const priorVisits = history.filter(
      (visit) =>
        visit.patient_id === row.patient_id &&
        Date.parse(visit.slot_start) < startedAt,
    ).length;

    return {
      id: row.id,
      slot_start: row.slot_start,
      slot_end: row.slot_end,
      status: row.status as AppointmentStatus,
      patient_note: row.patient_note,
      cancel_reason: row.cancel_reason,
      patient,
      isFirstVisit: priorVisits === 0,
    };
  });

  const clinicName = clinics.data?.[0]?.clinic
    ? Array.isArray(clinics.data[0].clinic)
      ? clinics.data[0].clinic[0]?.name
      : (clinics.data[0].clinic as { name: string }).name
    : null;

  const displayName = /^dr\.?\s/i.test(profile.full_name)
    ? profile.full_name
    : `Dr. ${profile.full_name}`;

  return (
    <section>
      <h1 className="font-heading text-ink mb-0.5 text-xl font-semibold">
        {karachiGreeting(now)}, {displayName}
      </h1>
      <p className="text-ink-muted mb-[18px] text-[13.5px]">
        {formatGreetingDate(now)}
        {clinicName ? ` · ${clinicName}` : ""}
      </p>

      <StatCards
        items={[
          { value: todayCount.count ?? 0, label: "Today's appointments" },
          {
            value: pendingCount.count ?? 0,
            label: "Awaiting confirmation",
            tone: "warn",
          },
          { value: weekCount.count ?? 0, label: "This week" },
        ]}
      />

      <TabPills
        active={active}
        tabs={[
          {
            key: "today",
            label: "Today",
            href: "/doctor?tab=today",
            count: todayCount.count ?? 0,
          },
          {
            key: "upcoming",
            label: "Upcoming",
            href: "/doctor?tab=upcoming",
            count: upcomingCount.count ?? 0,
          },
          { key: "past", label: "Past", href: "/doctor?tab=past" },
        ]}
      />

      {appointments.length === 0 ? (
        <div className="border-line grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="text-ink font-medium">{EMPTY_COPY[active].title}</p>
          <p className="text-ink-muted text-sm">{EMPTY_COPY[active].body}</p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {appointments.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </section>
  );
}
