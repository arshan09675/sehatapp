/**
 * Shared result shape for admin server actions driven by useActionState.
 * Mirrors AuthFormState from actions/auth.ts (kept separate so auth and
 * admin actions can evolve independently).
 */
export type AdminActionResult = {
  /** Per-field validation errors, keyed by input name. */
  fieldErrors?: Record<string, string[]>;
  /** Form-level error (authorization, database, unexpected). */
  formError?: string;
};

export type AdminFormState = AdminActionResult | undefined;

/** Login credentials for a freshly created (or reset) doctor account. */
export type DoctorCredentials = {
  email: string;
  fullName: string;
  tempPassword: string;
};

export type CreateDoctorState =
  | (AdminActionResult & {
      created?: DoctorCredentials & { doctorId: string };
    })
  | undefined;

export type ResetPasswordState =
  (AdminActionResult & { credentials?: DoctorCredentials }) | undefined;
