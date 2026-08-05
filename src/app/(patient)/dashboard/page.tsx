import type { Metadata } from "next";
import Link from "next/link";

import { TabPills } from "@/components/doctor/tab-pills";
import {
  AppointmentCard,
  isCancellable,
  type PatientAppointment,
} from "@/components/patient/appointment-card";
import {
  BookingConfirmation,
  type ConfirmedBooking,
} from "@/components/patient/booking-confirmation";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/lib/appointments";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your appointments" };

const APPOINTMENT_SELECT =
  "id, slot_start, status, fee_pkr, patient_note, cancel_reason, " +
  "doctor:doctors!doctor_id(id, full_name, specialty), " +
  "clinic:clinics!clinic_id(name, area, city, address)";

type Embedded<T> = T | T[] | null;
function one<T>(value: Embedded<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type AppointmentRow = {
  id: string;
  slot_start: string;
  status: string;
  fee_pkr: number;
  patient_note: string | null;
  cancel_reason: string | null;
  doctor: Embedded<{ id: string; full_name: string; specialty: string }>;
  clinic: Embedded<{
    name: string;
    area: string;
    city: string;
    address: string;
  }>;
};

function toAppointment(row: AppointmentRow): PatientAppointment {
  return {
    id: row.id,
    slotStart: row.slot_start,
    status: row.status as AppointmentStatus,
    feePkr: row.fee_pkr,
    patientNote: row.patient_note,
    cancelReason: row.cancel_reason,
    doctor: one(row.doctor)
      ? {
          id: one(row.doctor)!.id,
          fullName: one(row.doctor)!.full_name,
          specialty: one(row.doctor)!.specialty,
        }
      : null,
    clinic: one(row.clinic),
  };
}

export default async function PatientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; booked?: string }>;
}) {
  const profile = await requireRole("patient");
  const { tab, booked } = await searchParams;
  const active = tab === "past" ? "past" : "upcoming";

  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const [upcoming, past, confirmed] = await Promise.all([
    supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("patient_id", profile.id)
      .gte("slot_start", nowIso)
      .order("slot_start", { ascending: true }),
    supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("patient_id", profile.id)
      .lt("slot_start", nowIso)
      .order("slot_start", { ascending: false })
      .limit(50),
    booked
      ? supabase
          .from("appointments")
          .select(APPOINTMENT_SELECT)
          .eq("id", booked)
          .eq("patient_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (upcoming.error || past.error) {
    throw new Error("Failed to load your appointments");
  }

  const rows = (active === "upcoming"
    ? (upcoming.data ?? [])
    : (past.data ?? [])) as unknown as AppointmentRow[];
  const appointments = rows.map(toAppointment);

  const confirmedRow = confirmed.data as unknown as AppointmentRow | null;
  const confirmation: ConfirmedBooking | null = confirmedRow
    ? (() => {
        const appointment = toAppointment(confirmedRow);
        if (!appointment.doctor || !appointment.clinic) return null;
        return {
          slotStart: appointment.slotStart,
          feePkr: appointment.feePkr,
          doctorName: appointment.doctor.fullName,
          specialty: appointment.doctor.specialty,
          clinicName: appointment.clinic.name,
          clinicAddress: appointment.clinic.address,
          clinicArea: appointment.clinic.area,
          clinicCity: appointment.clinic.city,
        };
      })()
    : null;

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">
        Assalam-o-Alaikum, {profile.full_name}
      </h1>
      <p className="text-muted-foreground mb-6">
        Your appointments, and everything you have booked before.
      </p>

      {confirmation && <BookingConfirmation booking={confirmation} />}

      <TabPills
        active={active}
        tabs={[
          {
            key: "upcoming",
            label: "Upcoming",
            href: "/dashboard?tab=upcoming",
            count: upcoming.data?.length ?? 0,
          },
          { key: "past", label: "Past", href: "/dashboard?tab=past" },
        ]}
      />

      {appointments.length === 0 ? (
        <div className="border-border grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="font-medium">
            {active === "upcoming"
              ? "No appointments yet"
              : "Nothing in your history yet"}
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            {active === "upcoming"
              ? "Find a doctor to book your first visit — booking is free and you pay at the clinic."
              : "Past visits appear here once their time has passed."}
          </p>
          {active === "upcoming" && (
            <Button asChild variant="outline" className="mt-2">
              <Link href="/doctors">Find a doctor</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              cancellable={isCancellable(appointment, now)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
