/**
 * Minimal i18n dictionary (see CLAUDE.md conventions): Urdu lives alongside
 * English from day one so a proper i18n pass later is cheap. No heavy i18n
 * library yet.
 */
export type Locale = "en" | "ur";

const en = {
  brand: "SehatBook",
  tagline:
    "Find trusted, verified doctors across Pakistan and book appointments in seconds.",
  findADoctor: "Find a Doctor",
} as const;

export type TranslationKey = keyof typeof en;

const ur: Record<TranslationKey, string> = {
  brand: "صحت بک",
  tagline:
    "پاکستان بھر میں مستند اور تصدیق شدہ ڈاکٹر تلاش کریں اور سیکنڈوں میں اپائنٹمنٹ بک کریں۔",
  findADoctor: "ڈاکٹر تلاش کریں",
};

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, ur };

export function t(key: TranslationKey, locale: Locale = "en"): string {
  return dictionaries[locale][key];
}
