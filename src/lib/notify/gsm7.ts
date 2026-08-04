/**
 * SMS text encoding: GSM-7 vs UCS-2, and what that costs.
 *
 * Pure — no I/O — so the numbers can be asserted in tests and printed by the
 * console driver.
 *
 * Why this exists: a single SMS holds 160 characters in GSM-7 but only 70 in
 * UCS-2, and one stray character flips the whole message. The app's own
 * formatters produce two of them — formatAppointmentWhen() joins with an em
 * dash ("Tuesday, 12 Aug — 3:30 PM") and doctorMetaLine() with a middle dot —
 * so a reminder would silently cost double without normalizeForSms().
 *
 * Names are deliberately NOT stripped down to GSM-7. A doctor whose
 * profiles.full_name is in Urdu script makes the message UCS-2, and paying for
 * a second segment is better than mangling someone's name. The console driver
 * reports encoding and segment count so that case is visible in dev rather
 * than arriving as a surprise on the provider's invoice.
 */

/** 3GPP 23.038 basic character set. Each of these is one septet. */
const GSM7_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);

/** The extension table. Reachable, but each costs two septets. */
const GSM7_EXTENDED = new Set("^{}\\[~]|€");

/**
 * Typographic characters the app's formatters emit, mapped to their GSM-7
 * equivalents. Applied to every rendered SMS body.
 */
const TRANSLITERATIONS: ReadonlyArray<[from: RegExp, to: string]> = [
  [/[—–]/g, "-"], // em/en dash — formatAppointmentWhen, formatLeaveDate
  [/·/g, "-"], // middle dot — doctorMetaLine
  [/[’‘]/g, "'"],
  [/[“”]/g, '"'],
  [/…/g, "..."],
  [/ /g, " "], // non-breaking space
];

/** Swap typographic characters for GSM-7 ones. Leaves everything else alone. */
export function normalizeForSms(text: string): string {
  return TRANSLITERATIONS.reduce(
    (out, [from, to]) => out.replace(from, to),
    text,
  );
}

/** Whether every character survives GSM-7 encoding. */
export function isGsm7(text: string): boolean {
  return [...text].every(
    (char) => GSM7_BASIC.has(char) || GSM7_EXTENDED.has(char),
  );
}

export type SmsMetrics = {
  encoding: "GSM-7" | "UCS-2";
  /** Septets for GSM-7, UTF-16 code units for UCS-2. */
  units: number;
  /** Billable parts. Concatenated messages lose header room from each part. */
  segments: number;
};

export function smsMetrics(text: string): SmsMetrics {
  if (isGsm7(text)) {
    const units = [...text].reduce(
      (total, char) => total + (GSM7_EXTENDED.has(char) ? 2 : 1),
      0,
    );
    return {
      encoding: "GSM-7",
      units,
      segments: units <= 160 ? 1 : Math.ceil(units / 153),
    };
  }

  // UCS-2 bills per 16-bit unit, so an astral character (an emoji) counts two.
  const units = text.length;
  return {
    encoding: "UCS-2",
    units,
    segments: units <= 70 ? 1 : Math.ceil(units / 67),
  };
}
