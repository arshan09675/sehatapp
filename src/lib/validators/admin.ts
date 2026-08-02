import * as z from "zod";

import { pakPhoneSchema, emailSchema } from "@/lib/validators/auth";

export const clinicSchema = z.object({
  name: z
    .string({ error: "Clinic name is required." })
    .trim()
    .min(2, { error: "Clinic name must be at least 2 characters." })
    .max(120, { error: "Clinic name must be at most 120 characters." }),
  address: z
    .string({ error: "Address is required." })
    .trim()
    .min(5, { error: "Address must be at least 5 characters." })
    .max(300, { error: "Address must be at most 300 characters." }),
  area: z
    .string({ error: "Area is required." })
    .trim()
    .min(1, { error: "Select an area." })
    .max(80),
  city: z
    .string({ error: "City is required." })
    .trim()
    .min(1, { error: "Select a city." })
    .max(80),
});

export type ClinicInput = z.infer<typeof clinicSchema>;

/** One clinic assignment on the doctor onboarding form. */
export const doctorClinicSchema = z.object({
  clinicId: z.uuid({ error: "Invalid clinic." }),
  feePkr: z.coerce
    .number({ error: "Enter the consultation fee." })
    .int({ error: "Fee must be a whole number of rupees." })
    .min(0, { error: "Fee cannot be negative." })
    .max(1_000_000, { error: "Fee looks too large." }),
});

export const createDoctorSchema = z.object({
  email: emailSchema,
  fullName: z
    .string({ error: "Full name is required." })
    .trim()
    .min(2, { error: "Full name must be at least 2 characters." })
    .max(100, { error: "Full name must be at most 100 characters." }),
  phone: pakPhoneSchema,
  pmcNumber: z
    .string({ error: "PMC number is required." })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9/-]{3,30}$/, {
      error: "PMC number may only contain letters, digits, / and -.",
    }),
  specialty: z
    .string({ error: "Specialty is required." })
    .trim()
    .min(2, { error: "Specialty must be at least 2 characters." })
    .max(80, { error: "Specialty must be at most 80 characters." }),
  qualifications: z
    .string()
    .trim()
    .max(300, { error: "Qualifications must be at most 300 characters." })
    .optional()
    .transform((v) => (v ? v : null)),
  bio: z
    .string()
    .trim()
    .max(2000, { error: "Bio must be at most 2000 characters." })
    .optional()
    .transform((v) => (v ? v : null)),
  experienceYears: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(70)], {
      error: "Experience must be a number of years between 0 and 70.",
    })
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  clinics: z
    .array(doctorClinicSchema)
    .min(1, { error: "Assign the doctor to at least one clinic." }),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

/** Doctor photo upload constraints — mirror the bucket's server-side limits. */
export const DOCTOR_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const DOCTOR_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
