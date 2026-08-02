"use client";

import { useActionState, useMemo, useState } from "react";

import { createClinic, updateClinic } from "@/actions/clinics";
import { FormField } from "@/components/auth/form-field";
import { PendingButton } from "@/components/admin/pending-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export type ClinicFormValues = {
  id: string;
  name: string;
  address: string;
  area: string;
  city: string;
};

export function ClinicForm({
  areas,
  clinic,
}: {
  /** Area options from the areas table (seeded with Lahore areas). */
  areas: Array<{ name: string; city: string }>;
  /** Present in edit mode; absent when creating. */
  clinic?: ClinicFormValues;
}) {
  const [state, action, pending] = useActionState(
    clinic ? updateClinic.bind(null, clinic.id) : createClinic,
    undefined,
  );

  const cities = useMemo(() => [...new Set(areas.map((a) => a.city))], [areas]);
  const [city, setCity] = useState(clinic?.city ?? cities[0] ?? "Lahore");
  const cityAreas = areas.filter((a) => a.city === city);

  return (
    <form action={action} className="grid max-w-lg gap-4" noValidate>
      {state?.formError && (
        <Alert variant="destructive">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      )}

      <FormField
        id="name"
        name="name"
        label="Clinic name"
        defaultValue={clinic?.name}
        required
        errors={state?.fieldErrors?.name}
      />
      <FormField
        id="address"
        name="address"
        label="Street address"
        hint="e.g. 12-B, Main Boulevard, near Expo Centre"
        defaultValue={clinic?.address}
        required
        errors={state?.fieldErrors?.address}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="city">City</Label>
        <NativeSelect
          id="city"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-invalid={!!state?.fieldErrors?.city || undefined}
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        {state?.fieldErrors?.city && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.city[0]}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="area">Area</Label>
        <NativeSelect
          id="area"
          name="area"
          defaultValue={clinic?.area ?? ""}
          required
          aria-invalid={!!state?.fieldErrors?.area || undefined}
        >
          <option value="" disabled>
            Select an area…
          </option>
          {cityAreas.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
        {state?.fieldErrors?.area && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.area[0]}
          </p>
        )}
      </div>

      <div>
        <PendingButton disabled={pending}>
          {clinic ? "Save changes" : "Create clinic"}
        </PendingButton>
      </div>
    </form>
  );
}
