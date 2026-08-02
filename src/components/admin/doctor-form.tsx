"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createDoctor } from "@/actions/doctors";
import { FormField } from "@/components/auth/form-field";
import { CopyButton } from "@/components/admin/copy-button";
import { PendingButton } from "@/components/admin/pending-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n";

export type ClinicOption = {
  id: string;
  name: string;
  area: string;
  city: string;
};

export function DoctorForm({ clinics }: { clinics: ClinicOption[] }) {
  const [state, action, pending] = useActionState(createDoctor, undefined);
  const [selectedClinics, setSelectedClinics] = useState<Set<string>>(
    new Set(),
  );

  if (state?.created) {
    const { fullName, email, tempPassword, doctorId } = state.created;
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Dr. {fullName} onboarded</CardTitle>
          <CardDescription>
            Share these login details with the doctor over WhatsApp or SMS. The
            password is shown only once — it cannot be retrieved later (only
            reset from the doctor&rsquo;s page).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <dt className="text-muted-foreground text-xs">Email</dt>
                <dd className="font-mono">{email}</dd>
              </div>
              <CopyButton value={email} label="Copy" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <dt className="text-muted-foreground text-xs">
                  Temporary password
                </dt>
                <dd className="font-mono">{tempPassword}</dd>
              </div>
              <CopyButton value={tempPassword} label="Copy" />
            </div>
          </dl>
          <Alert>
            <AlertTitle>Next step: verification</AlertTitle>
            <AlertDescription>
              The doctor stays hidden from patients until you check their PMC
              number and mark them verified.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/admin/doctors/${doctorId}`}>Open doctor page</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/verification">Verification queue</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleClinic = (id: string, checked: boolean) => {
    setSelectedClinics((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <form action={action} className="grid max-w-lg gap-6" noValidate>
      {state?.formError && (
        <Alert variant="destructive">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      )}

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium">Account</legend>
        <FormField
          id="fullName"
          name="fullName"
          label={t("fullName")}
          autoComplete="off"
          required
          errors={state?.fieldErrors?.fullName}
        />
        <FormField
          id="email"
          name="email"
          type="email"
          label={t("email")}
          hint="The doctor logs in with this email and a temporary password generated on save."
          autoComplete="off"
          required
          errors={state?.fieldErrors?.email}
        />
        <FormField
          id="phone"
          name="phone"
          type="tel"
          label={t("phone")}
          hint={t("phoneHint")}
          autoComplete="off"
          required
          errors={state?.fieldErrors?.phone}
        />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium">
          Professional profile
        </legend>
        <FormField
          id="pmcNumber"
          name="pmcNumber"
          label="PMC registration number"
          hint="Checked manually against the PMDC register before verification."
          required
          errors={state?.fieldErrors?.pmcNumber}
        />
        <FormField
          id="specialty"
          name="specialty"
          label="Specialty"
          hint="e.g. Cardiologist, Dermatologist, General Physician"
          required
          errors={state?.fieldErrors?.specialty}
        />
        <FormField
          id="qualifications"
          name="qualifications"
          label="Qualifications (optional)"
          hint="e.g. MBBS, FCPS (Cardiology)"
          errors={state?.fieldErrors?.qualifications}
        />
        <FormField
          id="experienceYears"
          name="experienceYears"
          type="number"
          min={0}
          max={70}
          label="Years of experience (optional)"
          errors={state?.fieldErrors?.experienceYears}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="bio">Bio (optional)</Label>
          <Textarea
            id="bio"
            name="bio"
            rows={4}
            placeholder="Short introduction shown on the doctor's public profile."
            aria-invalid={!!state?.fieldErrors?.bio || undefined}
          />
          {state?.fieldErrors?.bio && (
            <p className="text-destructive text-xs">
              {state.fieldErrors.bio[0]}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="photo">Photo (optional)</Label>
          <Input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-invalid={!!state?.fieldErrors?.photo || undefined}
          />
          {state?.fieldErrors?.photo ? (
            <p className="text-destructive text-xs">
              {state.fieldErrors.photo[0]}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              JPEG, PNG, or WebP, up to 2 MB.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">
          Clinics &amp; consultation fee
        </legend>
        {state?.fieldErrors?.clinics && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.clinics[0]}
          </p>
        )}
        <div className="grid gap-2">
          {clinics.map((clinic) => {
            const checked = selectedClinics.has(clinic.id);
            const feeErrors = state?.fieldErrors?.[`fee_${clinic.id}`];
            return (
              <div
                key={clinic.id}
                className="border-border grid gap-2 rounded-lg border p-3"
              >
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="clinic"
                    value={clinic.id}
                    checked={checked}
                    onChange={(e) => toggleClinic(clinic.id, e.target.checked)}
                    className="accent-primary mt-0.5 size-4"
                  />
                  <span>
                    <span className="font-medium">{clinic.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      {clinic.area}, {clinic.city}
                    </span>
                  </span>
                </label>
                {checked && (
                  <div className="grid gap-1.5 pl-6">
                    <Label htmlFor={`fee_${clinic.id}`}>Fee (PKR)</Label>
                    <Input
                      id={`fee_${clinic.id}`}
                      name={`fee_${clinic.id}`}
                      type="number"
                      min={0}
                      step={50}
                      required
                      placeholder="e.g. 2000"
                      className="max-w-40"
                      aria-invalid={!!feeErrors?.length || undefined}
                    />
                    {feeErrors && (
                      <p className="text-destructive text-xs">{feeErrors[0]}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <div>
        <PendingButton disabled={pending} size="lg">
          Create doctor account
        </PendingButton>
      </div>
    </form>
  );
}
