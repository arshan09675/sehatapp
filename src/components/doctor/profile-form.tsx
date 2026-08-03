"use client";

import { useActionState } from "react";

import { updateDoctorProfile } from "@/actions/doctor-profile";
import { DoctorAvatar } from "@/components/admin/doctor-avatar";
import { ActionButton } from "./action-button";

export type DoctorProfileValues = {
  fullName: string;
  specialty: string;
  qualifications: string | null;
  bio: string | null;
  experienceYears: number | null;
  photoUrl: string | null;
};

const field =
  "border-line bg-surface text-ink focus-visible:border-brand min-h-11 w-full rounded-xl border px-3 text-base outline-none md:text-sm";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p role="alert" className="text-danger text-xs">
      {errors[0]}
    </p>
  );
}

export function ProfileForm({ profile }: { profile: DoctorProfileValues }) {
  const [state, formAction, pending] = useActionState(
    updateDoctorProfile,
    undefined,
  );

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state?.formError && (
        <p
          role="alert"
          className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-[13px]"
        >
          {state.formError}
        </p>
      )}

      <div className="flex items-center gap-4">
        <DoctorAvatar
          photoUrl={profile.photoUrl}
          name={profile.fullName}
          size={64}
        />
        <div className="grid flex-1 gap-1.5">
          <label htmlFor="photo" className="text-ink text-[13px] font-semibold">
            Photo
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="photo-hint"
            className="text-ink-muted file:border-line file:bg-surface-dim file:text-ink text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <p id="photo-hint" className="text-ink-muted text-xs">
            JPEG, PNG, or WebP — up to 2 MB. Patients see this on your profile.
          </p>
          <FieldError errors={state?.fieldErrors?.photo} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="specialty"
          className="text-ink text-[13px] font-semibold"
        >
          Specialty
        </label>
        <input
          id="specialty"
          name="specialty"
          required
          defaultValue={profile.specialty}
          aria-invalid={!!state?.fieldErrors?.specialty || undefined}
          className={field}
        />
        <FieldError errors={state?.fieldErrors?.specialty} />
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="qualifications"
          className="text-ink text-[13px] font-semibold"
        >
          Qualifications
        </label>
        <input
          id="qualifications"
          name="qualifications"
          defaultValue={profile.qualifications ?? ""}
          placeholder="MBBS, FCPS (Dermatology)"
          aria-invalid={!!state?.fieldErrors?.qualifications || undefined}
          className={field}
        />
        <FieldError errors={state?.fieldErrors?.qualifications} />
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="experienceYears"
          className="text-ink text-[13px] font-semibold"
        >
          Years of experience
        </label>
        <input
          id="experienceYears"
          name="experienceYears"
          type="number"
          min={0}
          max={70}
          inputMode="numeric"
          defaultValue={profile.experienceYears ?? ""}
          aria-invalid={!!state?.fieldErrors?.experienceYears || undefined}
          className={field}
        />
        <FieldError errors={state?.fieldErrors?.experienceYears} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="bio" className="text-ink text-[13px] font-semibold">
          About you
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={5}
          defaultValue={profile.bio ?? ""}
          placeholder="A short introduction patients will read before booking."
          aria-invalid={!!state?.fieldErrors?.bio || undefined}
          className="border-line bg-surface text-ink focus-visible:border-brand w-full rounded-xl border px-3 py-2.5 text-base outline-none md:text-sm"
        />
        <FieldError errors={state?.fieldErrors?.bio} />
      </div>

      <div>
        <ActionButton disabled={pending}>Save profile</ActionButton>
      </div>
    </form>
  );
}
