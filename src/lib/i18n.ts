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
  // auth
  login: "Log in",
  signup: "Sign up",
  logout: "Log out",
  email: "Email",
  password: "Password",
  fullName: "Full name",
  phone: "Mobile number",
  phoneHint: "e.g. 0300 1234567 — used for appointment SMS reminders",
  welcomeBack: "Welcome back",
  loginSubtitle: "Log in to manage your appointments.",
  createAccount: "Create your account",
  signupSubtitle: "Book appointments with verified doctors.",
  noAccountYet: "Don't have an account?",
  alreadyHaveAccount: "Already have an account?",
  checkEmailTitle: "Check your email",
  checkEmailBody:
    "We sent a confirmation link to your email. Open it to finish creating your account.",
  completeProfileTitle: "Complete your profile",
  completeProfileSubtitle:
    "Tell us your name and mobile number so clinics can reach you.",
  saveAndContinue: "Save and continue",
} as const;

export type TranslationKey = keyof typeof en;

const ur: Record<TranslationKey, string> = {
  brand: "صحت بک",
  tagline:
    "پاکستان بھر میں مستند اور تصدیق شدہ ڈاکٹر تلاش کریں اور سیکنڈوں میں اپائنٹمنٹ بک کریں۔",
  findADoctor: "ڈاکٹر تلاش کریں",
  login: "لاگ ان",
  signup: "سائن اپ",
  logout: "لاگ آؤٹ",
  email: "ای میل",
  password: "پاس ورڈ",
  fullName: "پورا نام",
  phone: "موبائل نمبر",
  phoneHint: "مثلاً 1234567 0300 — اپائنٹمنٹ کی ایس ایم ایس یاددہانی کے لیے",
  welcomeBack: "خوش آمدید",
  loginSubtitle: "اپنی اپائنٹمنٹس منظم کرنے کے لیے لاگ ان کریں۔",
  createAccount: "اپنا اکاؤنٹ بنائیں",
  signupSubtitle: "تصدیق شدہ ڈاکٹروں کے ساتھ اپائنٹمنٹ بک کریں۔",
  noAccountYet: "اکاؤنٹ نہیں ہے؟",
  alreadyHaveAccount: "پہلے سے اکاؤنٹ ہے؟",
  checkEmailTitle: "اپنی ای میل چیک کریں",
  checkEmailBody:
    "ہم نے آپ کی ای میل پر تصدیقی لنک بھیجا ہے۔ اکاؤنٹ مکمل کرنے کے لیے اسے کھولیں۔",
  completeProfileTitle: "اپنا پروفائل مکمل کریں",
  completeProfileSubtitle:
    "اپنا نام اور موبائل نمبر بتائیں تاکہ کلینک آپ سے رابطہ کر سکیں۔",
  saveAndContinue: "محفوظ کریں اور جاری رکھیں",
};

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, ur };

export function t(key: TranslationKey, locale: Locale = "en"): string {
  return dictionaries[locale][key];
}
