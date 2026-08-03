"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { requireDoctor } from "@/lib/auth/dal";
import {
  karachiDateKey,
  karachiDayOfWeek,
  karachiTimeKey,
} from "@/lib/datetime";
import {
  countSlots,
  isSlotWithinSchedule,
  WEEKDAYS,
  type DaySchedule,
} from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { leaveDaySchema, weekScheduleSchema } from "@/lib/validators/doctor";
import type { AdminFormState, ScheduleState } from "@/actions/form-state";

/**
 * Weekly timings and leave days.
 *
 * Runs on the RLS-governed server client: sched_owner_write and
 * exc_owner_write are complete `for all` policies with both using() and
 * with check(), scoped through doctor_clinics, so the service-role client is
 * not needed. requireDoctor() still gates every action, and each one
 * re-checks that the doctor_clinic_id in the form actually belongs to the
 * caller before trusting it.
 */

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const uuidSchema = z.uuid();

/** Resolve a doctor_clinics row the caller owns, or null. */
async function ownedAssociation(
  supabase: ServerClient,
  doctorClinicId: string,
  doctorId: string,
) {
  const { data } = await supabase
    .from("doctor_clinics")
    .select("id, clinic_id")
    .eq("id", doctorClinicId)
    .eq("doctor_id", doctorId)
    .maybeSingle();
  return data;
}

/**
 * Booked future visits the new hours no longer cover.
 *
 * Narrowing hours never cancels anything automatically — silently dropping a
 * patient's appointment would be indefensible — so this is advisory only.
 * Uses the same isSlotWithinSchedule() the booking RPC's rules are mirrored
 * from, so "inside my hours" means the same thing in both places.
 */
async function countBookingsOutsideHours(
  supabase: ServerClient,
  doctorId: string,
  clinicId: string,
  week: DaySchedule[],
): Promise<number> {
  const { data } = await supabase
    .from("appointments")
    .select("slot_start")
    .eq("doctor_id", doctorId)
    .eq("clinic_id", clinicId)
    .in("status", ["pending", "confirmed"])
    .gte("slot_start", new Date().toISOString());

  if (!data) return 0;

  return data.filter((appointment) => {
    const when = new Date(appointment.slot_start);
    return !isSlotWithinSchedule(
      week,
      karachiDayOfWeek(karachiDateKey(when)),
      karachiTimeKey(when),
    );
  }).length;
}

export async function saveWeeklySchedule(
  doctorClinicId: string,
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const { doctor } = await requireDoctor();

  if (!uuidSchema.safeParse(doctorClinicId).success) {
    return { formError: "Invalid clinic." };
  }

  const supabase = await createClient();
  const association = await ownedAssociation(
    supabase,
    doctorClinicId,
    doctor.id,
  );
  if (!association) {
    return { formError: "That clinic is not linked to your account." };
  }

  const parsed = weekScheduleSchema.safeParse(
    WEEKDAYS.map((day) => ({
      dayOfWeek: day.value,
      // An unchecked checkbox is simply absent from the FormData.
      enabled: formData.get(`day-${day.value}-enabled`) !== null,
      startTime: formData.get(`day-${day.value}-start`),
      endTime: formData.get(`day-${day.value}-end`),
      slotMinutes: formData.get(`day-${day.value}-slot`),
    })),
  );

  if (!parsed.success) {
    // Re-key zod's array paths ([2, "startTime"]) onto the real input names
    // so each error lands on its own control.
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const day = WEEKDAYS[Number(issue.path[0])];
      const field = String(issue.path[1] ?? "");
      const suffix =
        field === "startTime" ? "start" : field === "endTime" ? "end" : "slot";
      const key = day ? `day-${day.value}-${suffix}` : "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { fieldErrors };
  }

  const openDays = parsed.data.filter((day) => day.enabled);
  const closedDays = parsed.data
    .filter((day) => !day.enabled)
    .map((day) => day.dayOfWeek);

  const fieldErrors: Record<string, string[]> = {};
  for (const day of openDays) {
    if (countSlots(day.startTime, day.endTime, day.slotMinutes) === 0) {
      const label =
        WEEKDAYS.find((weekday) => weekday.value === day.dayOfWeek)?.long ??
        "This day";
      (fieldErrors[`day-${day.dayOfWeek}-end`] ??= []).push(
        `${label} needs to be at least one ${day.slotMinutes}-minute slot long.`,
      );
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Upsert first, delete second. The two statements are not one transaction,
  // so the order decides the failure mode: this way a failure either changes
  // nothing or, at worst, leaves an extra open day the doctor can see and
  // fix. Delete-then-insert fails with the whole week wiped.
  if (openDays.length > 0) {
    const { error } = await supabase.from("schedules").upsert(
      openDays.map((day) => ({
        doctor_clinic_id: doctorClinicId,
        day_of_week: day.dayOfWeek,
        start_time: day.startTime,
        end_time: day.endTime,
        slot_minutes: day.slotMinutes,
      })),
      { onConflict: "doctor_clinic_id,day_of_week" },
    );
    if (error) {
      return { formError: "Could not save your timings. Please try again." };
    }
  }

  if (closedDays.length > 0) {
    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("doctor_clinic_id", doctorClinicId)
      .in("day_of_week", closedDays);
    if (error) {
      return {
        formError:
          "Your open days were saved, but the closed days did not update. Reload the page and try again.",
      };
    }
  }

  const stranded = await countBookingsOutsideHours(
    supabase,
    doctor.id,
    association.clinic_id,
    openDays.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      startTime: day.startTime,
      endTime: day.endTime,
      slotMinutes: day.slotMinutes,
    })),
  );

  revalidatePath("/doctor/schedule");
  revalidatePath("/doctor");

  return {
    savedAt: Date.now(),
    notice:
      stranded > 0
        ? `${stranded} booked ${stranded === 1 ? "visit" : "visits"} now fall outside these hours. They are still booked — review them under Appointments.`
        : undefined,
  };
}

export async function addLeaveDay(
  doctorClinicId: string,
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const { doctor } = await requireDoctor();

  if (!uuidSchema.safeParse(doctorClinicId).success) {
    return { formError: "Invalid clinic." };
  }

  const parsed = leaveDaySchema.safeParse({
    onDate: formData.get("onDate"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // Date keys are ISO-shaped, so a string compare is a date compare.
  if (parsed.data.onDate < karachiDateKey()) {
    return { fieldErrors: { onDate: ["Pick today or a later date."] } };
  }

  const supabase = await createClient();
  const association = await ownedAssociation(
    supabase,
    doctorClinicId,
    doctor.id,
  );
  if (!association) {
    return { formError: "That clinic is not linked to your account." };
  }

  // unique (doctor_clinic_id, on_date): upsert so re-blocking a date that is
  // already blocked updates the reason instead of failing with 23505.
  const { error } = await supabase.from("schedule_exceptions").upsert(
    {
      doctor_clinic_id: doctorClinicId,
      on_date: parsed.data.onDate,
      is_closed: true,
      reason: parsed.data.reason,
    },
    { onConflict: "doctor_clinic_id,on_date" },
  );

  if (error) {
    return { formError: "Could not add the leave day. Please try again." };
  }

  revalidatePath("/doctor/schedule");
  return { savedAt: Date.now() };
}

export async function removeLeaveDay(
  exceptionId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  await requireDoctor();

  if (!uuidSchema.safeParse(exceptionId).success) {
    return { formError: "Invalid leave day." };
  }

  // exc_owner_write already scopes deletes to the caller's own clinics, so a
  // row belonging to another doctor simply matches nothing.
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_exceptions")
    .delete()
    .eq("id", exceptionId);

  if (error) {
    return { formError: "Could not remove the leave day. Please try again." };
  }

  revalidatePath("/doctor/schedule");
  return {};
}
