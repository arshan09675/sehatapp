import * as z from "zod";

/**
 * Normalize a Pakistani mobile number to E.164 (+923XXXXXXXXX).
 * Accepts common local formats: 0300 1234567, 0300-1234567, 3001234567,
 * 923001234567, 00923001234567, +92 300 1234567.
 * Returns the input (cleaned) unchanged when it can't be normalized —
 * the schema's regex check then produces the validation error.
 */
export function normalizePakPhone(raw: string): string {
  const cleaned = raw.replace(/[\s().-]/g, "");
  if (cleaned.startsWith("+92")) return cleaned;
  if (cleaned.startsWith("0092")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("92") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+92${cleaned.slice(1)}`;
  if (cleaned.startsWith("3") && cleaned.length === 10) return `+92${cleaned}`;
  return cleaned;
}

const PAK_MOBILE_E164 = /^\+923\d{9}$/;

export const pakPhoneSchema = z
  .string({ error: "Phone number is required." })
  .trim()
  .min(1, { error: "Phone number is required." })
  .transform(normalizePakPhone)
  .refine((v) => PAK_MOBILE_E164.test(v), {
    error: "Enter a valid Pakistani mobile number, e.g. 0300 1234567.",
  });

export const emailSchema = z
  .email({ error: "Enter a valid email address." })
  .trim()
  .toLowerCase();

export const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Password is required." })
    .min(8, { error: "Password must be at least 8 characters." })
    .max(72, { error: "Password must be at most 72 characters." }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Password is required." })
    .min(1, { error: "Password is required." }),
});

export const completeProfileSchema = z.object({
  fullName: z
    .string({ error: "Full name is required." })
    .trim()
    .min(2, { error: "Full name must be at least 2 characters." })
    .max(100, { error: "Full name must be at most 100 characters." }),
  phone: pakPhoneSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
