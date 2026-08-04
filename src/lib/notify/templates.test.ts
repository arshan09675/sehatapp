import { describe, expect, it } from "vitest";

import { isGsm7, smsMetrics } from "./gsm7";
import { renderTemplate, type AppointmentContext } from "./templates";
import { TEMPLATE_IDS } from "./types";

// Wednesday 12 August 2026, 3:30 PM in Asia/Karachi (UTC+05:00, no DST).
const SLOT = "2026-08-12T10:30:00+00:00";

/**
 * Representative rather than short: a long-but-ordinary Pakistani name and a
 * real Lahore hospital name. The one-segment assertions are only worth
 * anything against inputs the app will actually see.
 */
const CONTEXT: AppointmentContext = {
  patientName: "Muhammad Abdul Rehman",
  doctorName: "Ayesha Siddiqui",
  clinicName: "Hameed Latif Hospital",
  slotStart: SLOT,
  feePkr: 2000,
  cancelReason: null,
};

describe("template registry", () => {
  it("renders every id declared in TEMPLATE_IDS", () => {
    for (const id of TEMPLATE_IDS) {
      const { body } = renderTemplate(id, CONTEXT);
      expect(body.length).toBeGreaterThan(0);
    }
  });

  it("identifies the sender in every message", () => {
    for (const id of TEMPLATE_IDS) {
      expect(renderTemplate(id, CONTEXT).body).toContain("SehatBook");
    }
  });

  // The cost assertion. One non-GSM-7 character halves capacity, and the em
  // dash from formatAppointmentWhen is in every one of these bodies before
  // normalizeForSms runs.
  it("fits one GSM-7 segment for representative names", () => {
    for (const id of TEMPLATE_IDS) {
      const { body } = renderTemplate(id, CONTEXT);
      expect(isGsm7(body), `${id} left GSM-7: ${body}`).toBe(true);
      expect(smsMetrics(body).segments, `${id} spans segments: ${body}`).toBe(
        1,
      );
    }
  });

  it("leaves no unsubstituted placeholders", () => {
    for (const id of TEMPLATE_IDS) {
      const { body } = renderTemplate(id, CONTEXT);
      expect(body).not.toMatch(/\$\{|\{\{|undefined|null|NaN/);
    }
  });
});

describe("appointment facts", () => {
  it("renders the slot in Asia/Karachi, spelled out", () => {
    // 10:30 UTC is 3:30 PM in Karachi — a message that said 10:30 would send
    // patients to the clinic five hours early.
    const { body, variables } = renderTemplate(
      "booking_confirmed_patient",
      CONTEXT,
    );
    expect(variables.when).toBe("Wednesday, 12 Aug — 3:30 PM");
    expect(body).toContain("Wednesday, 12 Aug - 3:30 PM");
  });

  it("carries the same facts in variables as in the body", () => {
    const { body, variables } = renderTemplate(
      "booking_requested_patient",
      CONTEXT,
    );
    expect(variables.doctorName).toBe("Ayesha Siddiqui");
    expect(variables.clinic).toBe("Hameed Latif Hospital");
    expect(variables.fee).toBe("Rs. 2,000");
    expect(body).toContain("Ayesha Siddiqui");
    expect(body).toContain("Rs. 2,000");
  });

  it("titles the doctor and names the patient to the right party", () => {
    // Patient-facing copy is about the doctor; doctor-facing copy is about the
    // patient. Swapping them leaks the wrong name to the wrong person.
    expect(renderTemplate("booking_requested_patient", CONTEXT).body).toContain(
      "Dr. Ayesha Siddiqui",
    );
    expect(renderTemplate("booking_requested_doctor", CONTEXT).body).toContain(
      "Muhammad Abdul Rehman",
    );
    expect(renderTemplate("reminder_doctor", CONTEXT).body).toContain(
      "Muhammad Abdul Rehman",
    );
  });

  it("promises a follow-up rather than claiming a pending booking is confirmed", () => {
    const requested = renderTemplate("booking_requested_patient", CONTEXT).body;
    expect(requested).toContain("Booking requested");
    expect(requested).toContain("when it is confirmed");
  });
});

describe("cancellation reasons", () => {
  const withReason = (cancelReason: string | null): AppointmentContext => ({
    ...CONTEXT,
    cancelReason,
  });

  it("omits the clause entirely when there is no reason", () => {
    const { body } = renderTemplate(
      "booking_cancelled_patient",
      withReason(null),
    );
    expect(body).not.toContain("Reason");
    expect(body).not.toContain("null");
  });

  it("omits the clause for a blank reason", () => {
    expect(
      renderTemplate("booking_cancelled_doctor", withReason("   ")).body,
    ).not.toContain("Reason");
  });

  it("includes a short reason verbatim", () => {
    const { body } = renderTemplate(
      "booking_cancelled_patient",
      withReason("Doctor called to emergency surgery"),
    );
    expect(body).toContain("Reason: Doctor called to emergency surgery");
  });

  // cancel_reason allows 200 characters (validators/doctor.ts:64) — enough to
  // push the message to a third segment on its own.
  it("truncates a reason at the limit and still fits one segment", () => {
    const { body } = renderTemplate(
      "booking_cancelled_patient",
      withReason("x".repeat(200)),
    );
    expect(body).toContain("...");
    expect(body).not.toContain("x".repeat(70));
    expect(smsMetrics(body).segments).toBe(1);
  });
});
