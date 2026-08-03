import Link from "next/link";

import { docBtnSoft } from "./styles";

export type ClinicAssociation = {
  id: string;
  feePkr: number;
  clinic: { name: string; area: string; city: string; address: string };
};

/**
 * Read-only view of where this doctor practises. Fees and assignments are set
 * during admin onboarding (BUILD_PLAN Phase 3 asks for a view, not an editor),
 * though dc_owner_write would permit self-service edits later.
 */
export function ClinicAssociations({
  associations,
}: {
  associations: ClinicAssociation[];
}) {
  if (associations.length === 0) {
    return (
      <div className="border-line grid justify-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
        <p className="text-ink font-medium">No clinics yet</p>
        <p className="text-ink-muted text-sm">
          An administrator assigns you to a clinic before patients can book.
          Contact your SehatBook admin to get set up.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {associations.map((association) => (
        <div
          key={association.id}
          className="bg-surface-dim flex flex-wrap items-center justify-between gap-3 rounded-[11px] px-3.5 py-3"
        >
          <div>
            <div className="text-ink text-sm font-semibold">
              {association.clinic.name}
            </div>
            <div className="text-ink-muted text-[12.5px]">
              {association.clinic.area}, {association.clinic.city} &middot;{" "}
              {association.clinic.address}
            </div>
          </div>
          <div className="text-ink text-sm font-semibold tabular-nums">
            Rs. {association.feePkr.toLocaleString("en-PK")}
          </div>
        </div>
      ))}
      <div>
        <Link href="/doctor/schedule" className={docBtnSoft}>
          Set your timings
        </Link>
      </div>
    </div>
  );
}
