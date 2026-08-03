"use client";

import { useRouter } from "next/navigation";

import { MapPinIcon } from "@/components/landing/icons";

export type ClinicOption = {
  doctorClinicId: string;
  label: string;
};

/**
 * The reference's `.clinic-sel`. Selection lives in the URL (?clinic=…) so the
 * week renders on the server and the choice survives a reload or a shared
 * link.
 */
export function ClinicPicker({
  options,
  selected,
}: {
  options: ClinicOption[];
  selected: string;
}) {
  const router = useRouter();

  return (
    <div className="bg-surface-dim text-ink mb-4 flex items-center gap-2.5 rounded-[11px] px-3.5 py-2.5 text-sm font-semibold">
      <MapPinIcon className="text-brand size-4 flex-none" />
      <select
        aria-label="Clinic"
        value={selected}
        onChange={(event) =>
          router.replace(`/doctor/schedule?clinic=${event.target.value}`)
        }
        className="text-ink focus-visible:outline-brand flex-1 cursor-pointer appearance-none border-none bg-transparent font-sans text-sm font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {options.map((option) => (
          <option key={option.doctorClinicId} value={option.doctorClinicId}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
