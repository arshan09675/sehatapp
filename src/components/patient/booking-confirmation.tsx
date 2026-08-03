import { ShieldCheckIcon } from "@/components/landing/icons";
import { formatAppointmentWhen } from "@/lib/datetime";
import { formatFee } from "@/lib/doctor-display";

export type ConfirmedBooking = {
  slotStart: string;
  feePkr: number;
  doctorName: string;
  specialty: string;
  clinicName: string;
  clinicAddress: string;
  clinicArea: string;
  clinicCity: string;
};

/**
 * Post-booking confirmation.
 *
 * The design reference has no confirmation screen at all — its demo just
 * flashes the button green. DESIGN.md:121-126 specifies the contents, and all
 * of them are here deliberately: the PMC badge, the doctor, the clinic with
 * its **full address** (a patient needs to actually find the place), the date
 * spelled out, the fee, and the pay-at-clinic note so nobody arrives thinking
 * they have already paid.
 */
export function BookingConfirmation({
  booking,
}: {
  booking: ConfirmedBooking;
}) {
  return (
    <div className="bg-success-soft border-success/30 mb-6 rounded-2xl border p-5">
      <div className="text-success mb-3 flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>✓</span> Appointment booked
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-ink text-lg font-semibold">
              {booking.doctorName}
            </span>
            <span className="bg-brand-soft text-brand inline-flex items-center gap-[5px] rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold">
              <ShieldCheckIcon className="size-[13px] flex-none" /> PMC Verified
            </span>
          </div>
          <p className="text-ink-muted mt-0.5 text-sm">{booking.specialty}</p>

          <p className="text-ink mt-3 text-sm font-semibold">
            {formatAppointmentWhen(booking.slotStart)}
          </p>
        </div>

        <div className="text-sm">
          <p className="text-ink font-semibold">{booking.clinicName}</p>
          <p className="text-ink-muted mt-0.5">
            {booking.clinicAddress}
            <br />
            {booking.clinicArea}, {booking.clinicCity}
          </p>
          <p className="text-ink mt-3 font-semibold tabular-nums">
            {formatFee(booking.feePkr)}{" "}
            <span className="text-ink-muted font-normal">
              — pay at the clinic
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
