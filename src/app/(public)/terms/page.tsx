import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms you agree to when booking a doctor through SehatBook: what we do, what we verify, and where our responsibility ends.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="August 2026"
      intro="These are the terms you agree to when you use SehatBook. We have kept them short and readable on purpose."
    >
      <LegalSection title="What SehatBook is">
        <p>
          SehatBook helps you find a doctor in Lahore and book an appointment.
          We are not a hospital or a clinic, we do not employ the doctors listed
          here, and nothing on this site is medical advice. Any decision about
          your care belongs to you and your doctor.
        </p>
      </LegalSection>

      <LegalSection title="Doctor verification">
        <p>
          Before a doctor appears on SehatBook, our staff check their PMC
          registration number against the public register. That check confirms
          the doctor is registered — it is not an endorsement of any particular
          treatment or outcome.
        </p>
      </LegalSection>

      <LegalSection title="Bookings and fees">
        <p>
          Booking through SehatBook is free. The consultation fee is set by the
          doctor, shown on their profile before you book, and paid directly at
          the clinic. We do not take a cut of it and we do not process payments.
        </p>
      </LegalSection>

      <LegalSection title="Cancellations">
        <p>
          Plans change. If you cannot make an appointment, cancel it from your
          dashboard so the slot goes back to someone who needs it. Clinics may
          also cancel or reschedule — if that happens, we let you know on the
          number you signed up with.
        </p>
      </LegalSection>

      <LegalSection title="Using the site fairly">
        <p>
          Book under your own name, for appointments you intend to keep.
          Repeated no-shows or bookings made to block a doctor&apos;s calendar
          are grounds for closing an account.
        </p>
      </LegalSection>

      <LegalSection title="Where our responsibility ends">
        <p>
          We work to keep listings, fees and availability accurate, and to keep
          the site running. What we cannot stand behind is the care itself — the
          medical relationship is between you and your doctor. If a listing
          looks wrong, tell us and we will correct it.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms go to{" "}
          <a href="mailto:salaam@sehatbook.pk">salaam@sehatbook.pk</a>. In an
          emergency, do not use SehatBook — call <a href="tel:1122">1122</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
