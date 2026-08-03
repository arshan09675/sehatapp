import * as z from "zod";

import {
  bioSchema,
  experienceYearsSchema,
  qualificationsSchema,
  specialtySchema,
} from "@/lib/validators/admin";
import { SLOT_MINUTES_OPTIONS } from "@/lib/schedule";

/**
 * Doctor self-service forms. The profile fields are shared with admin
 * onboarding; note that pmc_number and the verification columns are
 * deliberately absent — a doctor may not edit either, and the profile action
 * whitelists the columns it writes rather than spreading parsed input.
 */
export const doctorProfileSchema = z.object({
  specialty: specialtySchema,
  qualifications: qualificationsSchema,
  bio: bioSchema,
  experienceYears: experienceYearsSchema,
});

export type DoctorProfileInput = z.infer<typeof doctorProfileSchema>;

const timeSchema = z
  .string({ error: "Pick a time." })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Pick a time." });

/** One weekday row of the weekly timings form. */
export const scheduleDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  enabled: z.boolean(),
  startTime: timeSchema,
  endTime: timeSchema,
  slotMinutes: z.coerce
    .number({ error: "Pick a slot length." })
    .int()
    // Mirrors the schedules.slot_minutes CHECK constraint; anything else
    // would come back as Postgres 23514 instead of a field error.
    .refine((v) => (SLOT_MINUTES_OPTIONS as readonly number[]).includes(v), {
      error: "Slot length must be 10, 15, 20, 30, 45, or 60 minutes.",
    }),
});

export const weekScheduleSchema = z
  .array(scheduleDaySchema)
  .length(7, { error: "The weekly timings form is incomplete." });

export type ScheduleDayInput = z.infer<typeof scheduleDaySchema>;

export const leaveDaySchema = z.object({
  onDate: z
    .string({ error: "Pick a date." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a date." }),
  reason: z
    .string()
    .trim()
    .max(160, { error: "Reason must be at most 160 characters." })
    .optional()
    .transform((v) => (v ? v : null)),
});

export const cancelReasonSchema = z
  .string()
  .trim()
  .max(200, { error: "Reason must be at most 200 characters." })
  .optional()
  .transform((v) => (v ? v : null));
