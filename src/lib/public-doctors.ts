import "server-only";

import type { PickerDay } from "@/components/public/slot-picker";
import {
  buildAvailability,
  firstOpenSlot,
  type AvailabilityDay,
} from "@/lib/availability";
import {
  addDays,
  formatDayMonth,
  formatWeekdayShort,
  karachiDateKey,
  karachiDayStart,
} from "@/lib/datetime";
import type { DaySchedule } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

/**
 * Public doctor discovery.
 *
 * Every query here runs on the ordinary anon/RLS client. `doctors_public_read`
 * exposes verified doctors, and clinics, doctor_clinics, schedules, and
 * schedule_exceptions are all `using (true)`, so slot generation needs no
 * elevated access. The one thing a visitor genuinely cannot read is
 * `appointments`, which is why booked times come from the taken_slots RPCs.
 *
 * Note the doctor's name comes from `doctors.full_name`, not a join to
 * profiles — see 0004_public_search_booking.sql for why.
 */

/** How far ahead the "next available" indicator looks. */
export const AVAILABILITY_DAYS = 7;
/** Days offered in the profile picker, matching the reference's three tabs. */
export const PICKER_DAYS = 3;
const SEARCH_LIMIT = 24;

export type PublicClinic = {
  id: string;
  name: string;
  area: string;
  city: string;
  address: string;
};

export type PublicDoctorClinic = {
  id: string;
  feePkr: number;
  clinic: PublicClinic;
};

export type PublicDoctor = {
  id: string;
  fullName: string;
  specialty: string;
  qualifications: string | null;
  bio: string | null;
  photoUrl: string | null;
  experienceYears: number | null;
  clinics: PublicDoctorClinic[];
};

export type NextOpening = {
  startsAt: Date;
  label: string;
  dateKey: string;
  clinicId: string;
};

export type DoctorSearchResult = PublicDoctor & {
  next: NextOpening | null;
  availableToday: boolean;
};

export type DoctorSearchFilters = {
  q?: string;
  city?: string;
  area?: string;
  specialty?: string;
};

const DOCTOR_SELECT =
  "id, full_name, specialty, qualifications, bio, photo_url, experience_years, " +
  "doctor_clinics!inner(id, fee_pkr, clinic:clinics!inner(id, name, area, city, address))";

/** PostgREST returns many-to-one embeds as an object, but the generated types
 *  are not always confident about it. */
function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * websearch_to_tsquery is forgiving, but punctuation-only input still reduces
 * to an empty query and a single stray quote is worth not forwarding. Keep
 * letters, digits, spaces, apostrophes, and hyphens; require two characters.
 */
export function sanitizeSearchQuery(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 2 ? cleaned : null;
}

type DoctorRow = {
  id: string;
  full_name: string;
  specialty: string;
  qualifications: string | null;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  doctor_clinics: Array<{
    id: string;
    fee_pkr: number;
    clinic: PublicClinic | PublicClinic[] | null;
  }>;
};

function toPublicDoctor(row: DoctorRow): PublicDoctor {
  return {
    id: row.id,
    fullName: row.full_name,
    specialty: row.specialty,
    qualifications: row.qualifications,
    bio: row.bio,
    photoUrl: row.photo_url,
    experienceYears: row.experience_years,
    clinics: row.doctor_clinics.flatMap((entry) => {
      const clinic = one(entry.clinic);
      return clinic ? [{ id: entry.id, feePkr: entry.fee_pkr, clinic }] : [];
    }),
  };
}

type ScheduleRow = {
  doctor_clinic_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
};

function scheduleFor(
  rows: readonly ScheduleRow[],
  doctorClinicId: string,
): DaySchedule[] {
  return rows
    .filter((row) => row.doctor_clinic_id === doctorClinicId)
    .map((row) => ({
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      slotMinutes: row.slot_minutes,
    }));
}

/**
 * Verified doctors matching the filters, each with the earliest slot a patient
 * could actually take.
 *
 * City and area live on `clinics`, two joins away, so they are applied as
 * inner-embed filters — which also narrows the returned clinic list to the
 * matching one, exactly what the card should show.
 */
export async function searchDoctors(
  filters: DoctorSearchFilters,
  now: Date = new Date(),
): Promise<DoctorSearchResult[]> {
  const supabase = await createClient();

  let query = supabase
    .from("doctors")
    .select(DOCTOR_SELECT)
    .eq("is_verified", true)
    .order("full_name")
    .limit(SEARCH_LIMIT);

  // Specialty and free text hit the same tsvector: the chips say
  // "Dermatology" while doctors register as "Dermatologist", and the english
  // stemmer folds both, which an equality filter could never do.
  const terms = [filters.specialty, filters.q]
    .map(sanitizeSearchQuery)
    .filter((term): term is string => term !== null);
  if (terms.length > 0) {
    query = query.textSearch("search_tsv", terms.join(" "), {
      type: "websearch",
    });
  }

  if (filters.city)
    query = query.eq("doctor_clinics.clinic.city", filters.city);
  if (filters.area)
    query = query.eq("doctor_clinics.clinic.area", filters.area);

  const { data, error } = await query;
  if (error) throw new Error("Failed to search doctors");

  const doctors = (data as unknown as DoctorRow[]).map(toPublicDoctor);
  if (doctors.length === 0) return [];

  return withAvailability(doctors, now);
}

/** One verified doctor, or null. */
export async function getPublicDoctor(
  doctorId: string,
): Promise<PublicDoctor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctors")
    .select(DOCTOR_SELECT)
    .eq("id", doctorId)
    .eq("is_verified", true)
    .maybeSingle();

  if (error || !data) return null;
  return toPublicDoctor(data as unknown as DoctorRow);
}

/** Day-by-day slots for one doctor at one clinic. */
export async function getAvailability(
  doctorId: string,
  clinicId: string,
  dayCount: number = PICKER_DAYS,
  now: Date = new Date(),
): Promise<AvailabilityDay[]> {
  const supabase = await createClient();
  const startDateKey = karachiDateKey(now);
  const endDateKey = addDays(startDateKey, dayCount);

  const { data: association } = await supabase
    .from("doctor_clinics")
    .select("id")
    .eq("doctor_id", doctorId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!association) return [];

  const [schedules, exceptions, taken] = await Promise.all([
    supabase
      .from("schedules")
      .select(
        "doctor_clinic_id, day_of_week, start_time, end_time, slot_minutes",
      )
      .eq("doctor_clinic_id", association.id),
    supabase
      .from("schedule_exceptions")
      .select("on_date")
      .eq("doctor_clinic_id", association.id)
      .eq("is_closed", true)
      .gte("on_date", startDateKey)
      .lt("on_date", endDateKey),
    supabase.rpc("taken_slots", {
      p_doctor_id: doctorId,
      p_clinic_id: clinicId,
      p_from: karachiDayStart(startDateKey).toISOString(),
      p_to: karachiDayStart(endDateKey).toISOString(),
    }),
  ]);

  return buildAvailability({
    schedules: scheduleFor(
      (schedules.data ?? []) as ScheduleRow[],
      association.id,
    ),
    closedDates: new Set((exceptions.data ?? []).map((row) => row.on_date)),
    takenAt: new Set(
      (taken.data ?? []).map((value: string) => new Date(value).getTime()),
    ),
    startDateKey,
    dayCount,
    now,
  });
}

/**
 * Flattens availability into the picker's serialisable shape.
 *
 * Past slots are dropped rather than greyed: a struck-through time means
 * "someone booked this" throughout the design, and reusing that treatment for
 * "this morning already happened" would misread. Taken slots stay visible,
 * per DESIGN.md:84-86.
 */
export function toPickerDays(
  days: readonly AvailabilityDay[],
  todayKey: string,
): PickerDay[] {
  return days.map((day, index) => {
    const relative =
      day.dateKey === todayKey
        ? "Today"
        : index === 1
          ? "Tomorrow"
          : formatWeekdayShort(day.dateKey);

    return {
      dateKey: day.dateKey,
      tabLine1: relative,
      // The weekday is redundant on tabs that already lead with it.
      tabLine2:
        relative === "Today" || relative === "Tomorrow"
          ? `${formatWeekdayShort(day.dateKey)} ${formatDayMonth(day.dateKey)}`
          : formatDayMonth(day.dateKey),
      bookLabel:
        day.dateKey === todayKey
          ? "today"
          : `${formatWeekdayShort(day.dateKey)} ${formatDayMonth(day.dateKey)}`,
      closed: day.closed,
      slots: day.slots
        .filter((slot) => !slot.past)
        .map((slot) => ({
          iso: slot.startsAt.toISOString(),
          label: slot.label,
          taken: slot.taken,
        })),
    };
  });
}

/**
 * Attaches the earliest real opening to each doctor. Batched deliberately:
 * three queries total regardless of how many doctors are on screen, rather
 * than a taken_slots round trip per card.
 */
async function withAvailability(
  doctors: PublicDoctor[],
  now: Date,
): Promise<DoctorSearchResult[]> {
  const supabase = await createClient();
  const startDateKey = karachiDateKey(now);
  const endDateKey = addDays(startDateKey, AVAILABILITY_DAYS);

  const doctorClinicIds = doctors.flatMap((doctor) =>
    doctor.clinics.map((clinic) => clinic.id),
  );
  if (doctorClinicIds.length === 0) {
    return doctors.map((doctor) => ({
      ...doctor,
      next: null,
      availableToday: false,
    }));
  }

  const [schedules, exceptions, taken] = await Promise.all([
    supabase
      .from("schedules")
      .select(
        "doctor_clinic_id, day_of_week, start_time, end_time, slot_minutes",
      )
      .in("doctor_clinic_id", doctorClinicIds),
    supabase
      .from("schedule_exceptions")
      .select("doctor_clinic_id, on_date")
      .in("doctor_clinic_id", doctorClinicIds)
      .eq("is_closed", true)
      .gte("on_date", startDateKey)
      .lt("on_date", endDateKey),
    supabase.rpc("taken_slots_bulk", {
      p_doctor_ids: doctors.map((doctor) => doctor.id),
      p_from: karachiDayStart(startDateKey).toISOString(),
      p_to: karachiDayStart(endDateKey).toISOString(),
    }),
  ]);

  const scheduleRows = (schedules.data ?? []) as ScheduleRow[];
  const closedByAssociation = new Map<string, Set<string>>();
  for (const row of exceptions.data ?? []) {
    const dates =
      closedByAssociation.get(row.doctor_clinic_id) ?? new Set<string>();
    dates.add(row.on_date);
    closedByAssociation.set(row.doctor_clinic_id, dates);
  }

  const takenByPair = new Map<string, Set<number>>();
  for (const row of taken.data ?? []) {
    const key = `${row.doctor_id}:${row.clinic_id}`;
    const times = takenByPair.get(key) ?? new Set<number>();
    times.add(new Date(row.slot_start).getTime());
    takenByPair.set(key, times);
  }

  return doctors.map((doctor) => {
    let next: NextOpening | null = null;

    for (const association of doctor.clinics) {
      const days = buildAvailability({
        schedules: scheduleFor(scheduleRows, association.id),
        closedDates: closedByAssociation.get(association.id) ?? new Set(),
        takenAt:
          takenByPair.get(`${doctor.id}:${association.clinic.id}`) ?? new Set(),
        startDateKey,
        dayCount: AVAILABILITY_DAYS,
        now,
      });

      const opening = firstOpenSlot(days);
      if (!opening) continue;
      if (!next || opening.slot.startsAt < next.startsAt) {
        next = {
          startsAt: opening.slot.startsAt,
          label: opening.slot.label,
          dateKey: opening.day.dateKey,
          clinicId: association.clinic.id,
        };
      }
    }

    return {
      ...doctor,
      next,
      availableToday: next?.dateKey === startDateKey,
    };
  });
}
