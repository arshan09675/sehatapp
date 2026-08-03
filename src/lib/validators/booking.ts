import * as z from "zod";

/** Free-text note a patient can attach when booking. */
export const patientNoteSchema = z
  .string()
  .trim()
  .max(500, { error: "Note must be at most 500 characters." })
  .optional()
  .transform((v) => (v ? v : null));

/**
 * A slot start as an ISO instant. Validated by parsing rather than by regex —
 * the value is round-tripped from our own picker, and Date.parse is the same
 * check the RPC's timestamptz cast would apply anyway.
 */
export const slotStartSchema = z
  .string({ error: "Pick a time slot." })
  .refine((value) => Number.isFinite(Date.parse(value)), {
    error: "Pick a time slot.",
  });

/** Search/filter params for /doctors, all optional and all URL-driven. */
export const doctorSearchParamsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
  specialty: z.string().trim().max(80).optional(),
});

export type DoctorSearchParams = z.infer<typeof doctorSearchParamsSchema>;
