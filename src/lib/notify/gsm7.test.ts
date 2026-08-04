import { describe, expect, it } from "vitest";

import { isGsm7, normalizeForSms, smsMetrics } from "./gsm7";

describe("normalizeForSms", () => {
  // The whole reason this module exists: formatAppointmentWhen() joins with an
  // em dash, which is not in GSM-7 and would halve every message's capacity.
  it("replaces the em dash formatAppointmentWhen emits", () => {
    const when = "Tuesday, 12 Aug — 3:30 PM";
    expect(isGsm7(when)).toBe(false);
    expect(normalizeForSms(when)).toBe("Tuesday, 12 Aug - 3:30 PM");
    expect(isGsm7(normalizeForSms(when))).toBe(true);
  });

  it("replaces the middle dot doctorMetaLine emits", () => {
    expect(normalizeForSms("Dermatologist · MBBS")).toBe(
      "Dermatologist - MBBS",
    );
  });

  it("replaces smart quotes, ellipses, and non-breaking spaces", () => {
    expect(isGsm7(normalizeForSms("we’re “here”… now"))).toBe(true);
    expect(normalizeForSms("we’re “here”…")).toBe('we\'re "here"...');
  });

  it("leaves plain text untouched", () => {
    const plain = "SehatBook: Confirmed - Dr. Ayesha Khan. Fee Rs. 2,000.";
    expect(normalizeForSms(plain)).toBe(plain);
  });

  // Names are not transliterated: paying for a second segment beats mangling
  // someone's name. The metrics just have to report it honestly.
  it("does not strip characters it has no mapping for", () => {
    expect(normalizeForSms("Dr. عائشہ")).toBe("Dr. عائشہ");
    expect(isGsm7("Dr. عائشہ")).toBe(false);
  });
});

describe("smsMetrics", () => {
  it("bills plain ASCII as GSM-7", () => {
    expect(smsMetrics("Hello")).toEqual({
      encoding: "GSM-7",
      units: 5,
      segments: 1,
    });
  });

  it("fits 160 GSM-7 characters in one segment and 161 in two", () => {
    expect(smsMetrics("a".repeat(160)).segments).toBe(1);
    expect(smsMetrics("a".repeat(161)).segments).toBe(2);
  });

  it("charges extension-table characters two septets", () => {
    // "€" is reachable in GSM-7 but only via the escape table.
    expect(smsMetrics("€")).toEqual({
      encoding: "GSM-7",
      units: 2,
      segments: 1,
    });
  });

  it("drops to UCS-2 and 70 characters on one non-GSM-7 character", () => {
    const urdu = "عائشہ";
    expect(smsMetrics(urdu).encoding).toBe("UCS-2");
    expect(smsMetrics("a".repeat(70) + urdu).segments).toBeGreaterThan(1);
    expect(smsMetrics("a".repeat(69) + "ہ").segments).toBe(1);
  });

  it("uses the concatenated-message sizes past one segment", () => {
    // 153 septets per part in GSM-7, 67 code units per part in UCS-2.
    expect(smsMetrics("a".repeat(306)).segments).toBe(2);
    expect(smsMetrics("a".repeat(307)).segments).toBe(3);
    expect(smsMetrics("ہ".repeat(134)).segments).toBe(2);
  });
});
