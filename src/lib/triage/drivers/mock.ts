/**
 * The rule-based driver: keyword scoring, no model, no network.
 *
 * This is the default, and it is what makes the feature demonstrable on a
 * laptop with no API key and no Ollama install. It is a real classifier, not a
 * stub — it scores a bilingual lexicon and returns the same validated shape as
 * every other driver, so switching TRIAGE_DRIVER changes accuracy, not
 * behaviour.
 *
 * How it decides:
 *   specialty — weighted term matches per specialty, highest total wins;
 *               ties and no-matches fall to General Physician, which is both
 *               the safe answer and usually the correct one.
 *   urgency   — the shared red-flag lexicon means emergency, a smaller
 *               severity/duration lexicon means medium, otherwise low.
 *
 * Reusing RED_FLAGS for urgency is deliberate: red flags *are* this driver's
 * emergency rules, so guard.ts is a no-op over mock output by construction.
 * The guard earns its place on the LLM drivers, where the classification is
 * not ours. docs/TRIAGE.md says so plainly rather than letting the eval imply
 * the guard is carrying the mock's emergency recall.
 */

import { RED_FLAGS } from "../guard";
import { specialties, type Specialty } from "../../specialties";
import { matchedTerms, normalize, type Matcher } from "../text";
import type { TriageDriver, TriageInput, Urgency } from "../types";

type LexiconEntry = {
  /** Points added per matched term. */
  weight: number;
  /** An array entry means all its words must appear — see Matcher in text.ts. */
  terms: readonly Matcher[];
};

/**
 * Weights are coarse on purpose: 3 for a term that names the body system
 * outright ("tooth", "daant"), 1 for a supporting hint that should never
 * decide a case alone ("jaw pain" could be dental or orthopaedic).
 *
 * Roman Urdu carries the same weight as English throughout. Anything less
 * would make the feature quietly worse for the patients most likely to use it.
 */
const SPECIALTY_LEXICON: Record<Specialty, readonly LexiconEntry[]> = {
  "General Physician": [
    {
      weight: 3,
      terms: [
        "fever",
        "bukhar",
        "flu",
        "diarrhea",
        "diarrhoea",
        ["loose", "motion"],
        "dast",
        "vomiting",
        "ulti",
        "nausea",
        "matli",
        "diabetes",
        "sugar",
        "thyroid",
        ["blood", "pressure"],
        "migraine",
        ["food", "poisoning"],
      ],
    },
    {
      weight: 2,
      terms: [
        "cough",
        "khansi",
        "cold",
        "nazla",
        "zukam",
        "headache",
        // Pain compounds as co-occurrence: "pait mein dard", "pait mein
        // shadeed dard" and "dard pait mein" are one entry this way.
        ["sar", "dard"],
        ["sir", "dard"],
        "sardard",
        "stomach",
        ["stomach", "pain"],
        ["pait", "dard"],
        ["peit", "dard"],
        "acidity",
        "tezabiyat",
        "heartburn",
        "gas",
        "constipation",
        "qabz",
        "weakness",
        "kamzori",
        "fatigue",
        "thakan",
        "thakawat",
        ["body", "ache"],
        ["jism", "dard"],
        "dizziness",
        "chakkar",
        "chakar",
        "dehydration",
      ],
    },
    {
      weight: 1,
      terms: [["sore", "throat"], ["gala", "kharab"], "appetite", "bhook"],
    },
  ],

  Dermatology: [
    {
      weight: 3,
      terms: [
        "rash",
        "skin",
        "jild",
        "itching",
        "itchy",
        "khujli",
        "khaj",
        "acne",
        "pimple",
        "daane",
        "dane",
        "kil",
        "eczema",
        "psoriasis",
        "ringworm",
        "dad",
        "daad",
        "fungal",
        "hives",
        "chaale",
        "chhale",
        "boil",
        "phora",
        "phunsi",
        ["hair", "fall"],
        ["baal", "jhar"],
        ["baal", "gir"],
        ["hair", "loss"],
        "vitiligo",
        "phulbehri",
        // A "patch" is a skin word. On the rare case it is not ("white
        // patches on my tonsils"), ENT's own terms outscore it.
        "patch",
      ],
    },
    {
      weight: 1,
      terms: [["dark", "spots"], "nishan", "scar", "blister", "peeling"],
    },
  ],

  Cardiology: [
    {
      weight: 3,
      terms: [
        "heart",
        "dil",
        "palpitation",
        "heartbeat",
        "dhadkan",
        "dharkan",
        "angina",
        "cholesterol",
        "bypass",
        "stent",
        "ecg",
        "heart attack",
        "dil ka dora",
        "dil ka daura",
      ],
    },
    // Co-occurrence, for the same reason guard.ts uses it: the phrase form
    // missed "pain in my chest" and "seene mein SHADEED dard", so the driver
    // spotted the red flag but could not name the specialty behind it.
    {
      weight: 2,
      terms: [
        ["chest", "pain"],
        ["chest", "tightness"],
        ["chest", "pressure"],
        ["seene", "dard"],
        ["sine", "dard"],
        ["chati", "dard"],
        ["high", "bp"],
        ["bp", "high"],
      ],
    },
    {
      weight: 1,
      terms: [
        ["swollen", "ankles"],
        ["swelling", "legs"],
        ["pairon", "sujan"],
        ["breathless", "walking"],
      ],
    },
  ],

  Pediatrics: [
    // Weighted to win outright: who the patient is decides the specialty
    // before what the symptom is. A feverish four-year-old is paediatric.
    {
      weight: 5,
      terms: [
        ["my", "child"],
        ["my", "son"],
        ["my", "daughter"],
        ["my", "kid"],
        "baby",
        "newborn",
        "infant",
        "toddler",
        // Single words, not "bachay ko": the postposition changes with the
        // sentence ("bachay ke honth", "bachay ki tabiyat") and pinning it
        // lost a child in respiratory distress.
        "bacha",
        "bachay",
        "bache",
        "bachi",
        "bachon",
        "beta",
        "beti",
        // "my 3 year old" is how a parent writes it. Requiring "my" is what
        // keeps "I am a 45 year old" out — imperfect, but a paediatrician
        // seeing an adult is a mistake the clinic catches at the door.
        ["my", "year", "old"],
        ["my", "month", "old"],
      ],
    },
    // No age phrasings here ("year old", "saal ka"): adults describe their own
    // age constantly — "I'm a 45 year old with chest pain" is not paediatric.
    {
      weight: 2,
      terms: [
        "vaccination",
        "immunisation",
        "immunization",
        "teeka",
        "months old",
        "mahine ka bacha",
      ],
    },
  ],

  Dentistry: [
    {
      weight: 3,
      terms: [
        "tooth",
        "teeth",
        "toothache",
        "daant",
        "dant",
        "danton",
        "gum",
        "gums",
        "masuray",
        "masore",
        "masudo",
        "cavity",
        "dental",
        ["wisdom", "tooth"],
        "filling",
        "braces",
        ["root", "canal"],
        "denture",
      ],
    },
    { weight: 1, terms: ["jaw", "jabra", ["bad", "breath"], ["munh", "bu"]] },
  ],

  Gynecology: [
    {
      weight: 3,
      terms: [
        "pregnant",
        "pregnancy",
        "hamal",
        "hamla",
        "period",
        "periods",
        "menstrual",
        "mahwari",
        "haiz",
        "vaginal",
        "uterus",
        "bachadani",
        "ovarian",
        "ovary",
        "pcos",
        "miscarriage",
        "contraception",
        ["family", "planning"],
        "delivery",
        ["labour", "pain"],
        ["labor", "pain"],
        "menopause",
        "infertility",
        ["bacha", "nahi", "thehar"],
      ],
    },
    { weight: 1, terms: [["pelvic", "pain"], "spotting", "discharge"] },
  ],

  Orthopedics: [
    {
      weight: 3,
      terms: [
        "fracture",
        ["broken", "bone"],
        "haddi",
        ["joint", "pain"],
        "joints",
        "jodo",
        ["jor", "dard"],
        "knee",
        "ghutna",
        "ghutno",
        // Not a bare ["back", "pain"]: that matches "throbbing PAIN in a
        // BACK tooth", and it tied Dentistry into a General Physician
        // fallback. The qualified forms carry the same signal without it.
        "backache",
        ["lower", "back"],
        ["upper", "back"],
        ["back", "hurting"],
        ["kamar", "dard"],
        "shoulder",
        "kandha",
        "sprain",
        "moch",
        "arthritis",
        "ligament",
        ["slipped", "disc"],
        "sciatica",
        "wrist",
        "ankle",
        "takhna",
        "hip",
        "spine",
        "reedh",
      ],
    },
    {
      weight: 1,
      terms: [
        "stiffness",
        "akran",
        ["cant", "walk"],
        ["chal", "nahi", "sakta"],
        "limping",
        ["swollen", "joint"],
        // Injury words. "arm" is deliberately absent — a stroke presents as
        // "cannot move his left arm", which is not an orthopaedic problem.
        "leg",
        "fell",
        ["bent", "wrong", "way"],
      ],
    },
  ],

  ENT: [
    {
      weight: 3,
      terms: [
        "ear",
        "ears",
        "kaan",
        "hearing",
        "sunai",
        "deaf",
        "behra",
        "tonsil",
        "tonsils",
        "sinus",
        "sinusitis",
        "nosebleed",
        "nakseer",
        "hoarse",
        ["awaz", "baith"],
        "snoring",
        "kharate",
        "vertigo",
        "tinnitus",
        ["kaan", "awaz"],
        ["kaan", "pani"],
        // Deliberately no ["kaan", "dard"]: "kaan" already scores on its own,
        // and the compound counted one ear twice — enough to outscore
        // Pediatrics on "bachi ko kaan mein dard hai" and send a child to ENT.
      ],
    },
    {
      weight: 2,
      terms: [
        "throat",
        "gala",
        "nose",
        "naak",
        ["blocked", "nose"],
        ["naak", "band"],
        "swallowing",
        "nigalne",
      ],
    },
  ],
};

/**
 * Severity cues that lift a complaint to "medium".
 *
 * Duration is handled separately, by hasLongDuration() below — a list of
 * phrases could never cover "for five days", "teen din se", "for the last
 * three months" and "kuch dinon se" without becoming a list of every number.
 */
const MEDIUM_MARKERS: readonly Matcher[] = [
  // Intensity, English and Urdu symmetrically. "bohat" is the everyday
  // intensifier and does the same work "very" does above it.
  "severe",
  "unbearable",
  "excruciating",
  "worst",
  "worse",
  ["very", "bad"],
  ["very", "painful"],
  ["very", "weak"],
  "worsening",
  "spreading",
  "shadeed",
  "bohat",
  "bohot",
  ["bardasht", "nahi"],
  "takleef",
  ["high", "fever"],
  ["tez", "bukhar"],
  "102",
  "103",
  "104",
  // Stopping someone eating, sleeping or walking is the practical test of
  // whether a complaint can wait.
  ["cant", "sleep"],
  ["cannot", "sleep"],
  ["neend", "nahi"],
  ["cant", "eat"],
  ["cannot", "eat"],
  ["cant", "chew"],
  ["cannot", "chew"],
  ["kha", "nahi", "sakta"],
  ["cant", "walk"],
  ["cannot", "walk"],
  ["chal", "nahi", "sakta"],
  ["raat", "bhar"],
  // Signs that something is active rather than settling.
  "swelling",
  "swollen",
  "sujan",
  "pus",
  "infection",
  "vomiting",
  "ulti",
  "dast",
  "moch",
  "repeatedly",
  ["keep", "getting"],
  "keeps",
  // Pain in pregnancy is never routine.
  ["hamal", "dard"],
  ["pregnant", "pain"],
];

/** Number words a patient might use, English and Roman Urdu. */
const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  ten: 10,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  panch: 5,
  chey: 6,
  // Quantifiers that mean "more than a couple" in practice.
  few: 3,
  several: 3,
  kuch: 3,
  kai: 4,
};

/** Time units in days. Plurals are listed so they can imply a count. */
const UNIT_DAYS: Record<string, number> = {
  day: 1,
  days: 1,
  din: 1,
  dinon: 1,
  week: 7,
  weeks: 7,
  hafta: 7,
  hafte: 7,
  hafton: 7,
  month: 30,
  months: 30,
  mahina: 30,
  mahine: 30,
  year: 365,
  years: 365,
  saal: 365,
};

const PLURAL_UNITS = new Set([
  "days",
  "dinon",
  "weeks",
  "hafton",
  "months",
  "hafte",
  "mahine",
  "years",
]);

/** Anything lasting this long has stopped being self-limiting. */
const LONG_DURATION_DAYS = 3;

/**
 * True when the patient says how long it has been going on, and that is long
 * enough to matter.
 *
 * How long a thing has lasted is the single most useful triage question after
 * "what is it", and it is the difference between a cold and a chest infection.
 * Parsed rather than listed: "for five days", "teen din se", "for the last
 * three months" and "kuch dinon se" all reduce to a number of days here.
 *
 * A bare plural counts ("for weeks") because a patient who pluralises means
 * more than one. A bare singular does not — "high on the home monitor this
 * week" is not a week-long complaint, and reading it as one would make every
 * mention of a calendar urgent.
 */
export function hasLongDuration(normalized: string): boolean {
  const tokens = normalized.trim().split(" ");

  return tokens.some((token, index) => {
    const unit = UNIT_DAYS[token];
    if (unit === undefined) return false;

    const previous = tokens[index - 1] ?? "";
    const digits = /^\d+$/.test(previous) ? Number(previous) : undefined;
    const count = digits ?? NUMBER_WORDS[previous];

    if (count !== undefined) return count * unit >= LONG_DURATION_DAYS;

    // No number in front: only a plural implies more than one.
    return PLURAL_UNITS.has(token) && unit * 2 >= LONG_DURATION_DAYS;
  });
}

function scoreSpecialty(normalized: string): {
  specialty: Specialty;
  terms: string[];
} {
  const scored = specialties.map((specialty) => {
    let score = 0;
    const hits: string[] = [];

    for (const entry of SPECIALTY_LEXICON[specialty]) {
      const found = matchedTerms(normalized, entry.terms);
      score += found.length * entry.weight;
      hits.push(...found);
    }

    return { specialty, score, hits };
  });

  const bestScore = Math.max(...scored.map((entry) => entry.score));
  const leaders = scored.filter((entry) => entry.score === bestScore);

  // Nothing matched, or two specialties matched equally well ("rash and joint
  // pain"): General Physician. Guessing between two narrow specialties sends
  // half those patients to the wrong clinic; a GP redirects them in person.
  if (bestScore === 0 || leaders.length > 1) {
    return {
      specialty: "General Physician",
      terms: leaders.flatMap((entry) => entry.hits),
    };
  }

  return { specialty: leaders[0].specialty, terms: leaders[0].hits };
}

function scoreUrgency(normalized: string): {
  urgency: Urgency;
  flags: string[];
} {
  const flags = RED_FLAGS.filter(
    (flag) => matchedTerms(normalized, flag.terms).length > 0,
  ).map((flag) => flag.label);

  if (flags.length > 0) return { urgency: "emergency", flags };

  const markers = matchedTerms(normalized, MEDIUM_MARKERS);
  const persistent = hasLongDuration(normalized);

  return {
    urgency: markers.length > 0 || persistent ? "medium" : "low",
    flags: [],
  };
}

/** Lead sentence per specialty, in DESIGN.md's voice: plain, no jargon. */
const SPECIALTY_REASON: Record<Specialty, string> = {
  "General Physician":
    "What you have described could have several everyday causes, so a general physician is the right first stop — they can examine you and refer you on if needed.",
  Dermatology:
    "What you have described affects the skin, and a dermatologist is the doctor who treats these.",
  Cardiology:
    "What you have described involves the heart, which is what a cardiologist looks after.",
  Pediatrics:
    "This is about a child, and a paediatrician is trained for children's health specifically.",
  Dentistry:
    "What you have described affects the teeth or gums, so a dentist is who you need.",
  Gynecology:
    "What you have described relates to women's reproductive health, which a gynaecologist handles.",
  Orthopedics:
    "What you have described involves bones, joints or muscles, which is an orthopaedic doctor's area.",
  ENT: "What you have described affects the ear, nose or throat, which an ENT specialist treats.",
};

const URGENCY_REASON: Record<Urgency, string> = {
  low: "It does not look urgent — book a normal appointment, and see someone sooner if it gets worse.",
  medium:
    "It is worth being seen soon rather than waiting for it to settle on its own.",
  emergency:
    "This needs emergency care now — go to the nearest emergency room or call 1122 instead of booking an appointment.",
};

function buildReasoning(
  specialty: Specialty,
  urgency: Urgency,
  terms: readonly string[],
  flags: readonly string[],
): string {
  // Naming what was matched is the whole explainability story on this driver:
  // the patient can see it read "khujli" and understand why it said skin.
  const noticed =
    flags.length > 0
      ? `You mentioned ${flags.slice(0, 2).join(" and ")}. `
      : terms.length > 0
        ? `You mentioned ${terms.slice(0, 3).join(", ")}. `
        : "";

  return `${noticed}${SPECIALTY_REASON[specialty]} ${URGENCY_REASON[urgency]}`;
}

export function createMockDriver(): TriageDriver {
  return {
    name: "mock",
    detail: "keyword rules",

    async classify(input: TriageInput) {
      const normalized = normalize(input.symptoms);
      const { specialty, terms } = scoreSpecialty(normalized);
      const { urgency, flags } = scoreUrgency(normalized);

      return {
        specialty,
        urgency,
        reasoning: buildReasoning(specialty, urgency, terms, flags),
      };
    },
  };
}
