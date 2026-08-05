import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What SehatBook collects when you book a doctor, why we collect it, and how to have it removed.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="August 2026"
      intro="SehatBook is a booking platform for clinics in Lahore. This page explains, in plain language, what we hold about you and what you can do about it."
    >
      <LegalSection title="What we collect">
        <p>
          When you create an account we store your name, email address and phone
          number. When you book, we store the appointment itself — which doctor,
          which clinic, and the date and time.
        </p>
        <p>
          Your phone number is there for one reason: appointment confirmations
          and reminders. We do not use it for marketing.
        </p>
      </LegalSection>

      <LegalSection title="Why we collect it">
        <p>
          To hold your appointment, to remind you before it, and to let the
          clinic know who is coming. Doctors also give us their PMC registration
          number so our staff can verify it before they appear on the site.
        </p>
      </LegalSection>

      <LegalSection title="Where it lives">
        <p>
          Your data sits in our Supabase database, encrypted in transit. Access
          is restricted at the database level, so an account can only read its
          own appointments.
        </p>
      </LegalSection>

      <LegalSection title="Who can see it">
        <p>
          The doctor and clinic you book with see your name, phone number and
          appointment. SehatBook staff can see account and verification details
          in order to run the service and check doctor registrations. Nobody
          else.
        </p>
      </LegalSection>

      <LegalSection title="What we never do">
        <p>
          We do not sell your data, share it with advertisers, or use your
          medical bookings to target you with anything.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can cancel any upcoming appointment from your dashboard. To
          correct your details, or to have your account and its history deleted,
          email us at{" "}
          <a href="mailto:salaam@sehatbook.pk">salaam@sehatbook.pk</a> and we
          will action it.
        </p>
      </LegalSection>

      <LegalSection title="In an emergency">
        <p>
          SehatBook is for planned appointments and is not monitored around the
          clock. If someone needs urgent help, call <a href="tel:1122">1122</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
