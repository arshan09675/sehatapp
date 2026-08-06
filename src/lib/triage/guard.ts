import { matchedTerms, normalize, type Matcher } from "./text";
import { URGENCIES, type Urgency } from "./types";

/**
 * The red-flag safety net.
 *
 * Every classification passes through here, whichever driver produced it. If
 * the patient's own words contain something that needs emergency care, the
 * urgency becomes "emergency" even when the model said "low".
 *
 * Two rules make this safe to run over everything:
 *
 *  1. It reads the *patient's text*, never the model's reasoning. Reasoning is
 *     model output — letting it trigger the guard would let a hallucinated
 *     sentence route someone to an ER screen.
 *  2. It can only escalate. The comparison is by index into URGENCIES, so a
 *     driver that already said "emergency" is never talked down by a lexicon
 *     that happens not to list the phrasing the patient used.
 *
 * This is a keyword net, not a triage protocol. It catches the phrasings that
 * must never be missed; it does not attempt to be exhaustive, and a "medium"
 * that stays "medium" is not evidence that nothing is wrong. The eval reports
 * how often it fires so its contribution stays visible rather than baked
 * invisibly into the accuracy number.
 */

export type RedFlag = {
  /** Stable id for the eval output. */
  id: string;
  /** Plain-language name, used in logs and the eval's guard summary. */
  label: string;
  /**
   * Any one of these trips the flag. An array entry means every word in it
   * must appear, in any order — see Matcher in text.ts. Most red flags use
   * that form, because the fixed-phrase form misses "seene mein SHADEED dard".
   */
  terms: readonly Matcher[];
};

/**
 * Phrasings that mean "go now", in English, Roman Urdu, and Urdu script.
 *
 * Chest pain is included on its own rather than only in combination with
 * breathlessness. It is the classic must-not-miss, and the cost of being
 * wrong is asymmetric: a patient sent to an ER for muscular chest pain loses
 * an evening, the reverse can cost a life.
 */
export const RED_FLAGS: readonly RedFlag[] = [
  {
    // Co-occurrence rather than phrases: "chest" anywhere plus "pain" anywhere
    // covers "chest pain", "pain in my chest", "crushing pain in my chest",
    // and "seene mein shadeed dard" — all of which fixed phrases missed.
    id: "chest_pain",
    label: "chest pain",
    terms: [
      ["chest", "pain"],
      ["chest", "tightness"],
      ["chest", "pressure"],
      ["seene", "dard"],
      ["sine", "dard"],
      ["seena", "dard"],
      ["chati", "dard"],
      ["seene", "takleef"],
      "heart attack",
      "dil ka dora",
      "dil ka daura",
      ["سینے", "درد"],
      "دل کا دورہ",
    ],
  },
  {
    id: "breathing",
    label: "difficulty breathing",
    terms: [
      ["cant", "breathe"],
      ["cannot", "breathe"],
      ["unable", "breathe"],
      ["trouble", "breathing"],
      ["difficulty", "breathing"],
      ["struggling", "breathe"],
      ["short", "breath"],
      ["breathless"],
      "gasping",
      "choking",
      // "saans nahi le pa raha", "saans nahi aa rahi", "saans nahi aata" —
      // the tail after "nahi" varies endlessly, so anchor on the two words
      // that do not.
      ["saans", "nahi"],
      ["saans", "phool"],
      ["saans", "rukh"],
      ["saans", "band"],
      ["saans", "takleef"],
      ["dam", "ghut"],
      ["سانس", "نہیں"],
    ],
  },
  {
    // Matcher arrays are unordered, so ["slurred", "speech"] covers both
    // "slurred speech" and "his speech is slurred" in one entry.
    id: "stroke",
    label: "stroke signs",
    terms: [
      ["face", "drooping"],
      ["slurred", "speech"],
      ["cannot", "speak"],
      ["cant", "speak"],
      ["one", "side", "body"],
      ["one", "sided", "weakness"],
      ["left", "side", "weak"],
      ["right", "side", "weak"],
      ["cannot", "move", "arm"],
      ["cant", "move", "arm"],
      ["sudden", "confusion"],
      "falij",
      "lakwa",
      ["munh", "tedha"],
      ["muh", "tairha"],
      "فالج",
      "لقوہ",
    ],
  },
  {
    id: "unconscious",
    label: "loss of consciousness",
    terms: [
      "unconscious",
      "unconsciousness",
      ["passed", "out"],
      ["blacked", "out"],
      "fainted",
      ["not", "waking"],
      ["nahi", "jaag"],
      "unresponsive",
      "behoshi",
      "behosh",
      ["be", "hosh"],
      ["بے", "ہوش"],
    ],
  },
  {
    id: "seizure",
    label: "seizure",
    terms: [
      "seizure",
      "convulsion",
      "convulsing",
      ["fit", "pad"],
      "mirgi",
      ["daura", "par"],
      ["jhatke", "lag"],
      "مرگی",
    ],
  },
  {
    id: "severe_bleeding",
    label: "heavy bleeding",
    terms: [
      ["bleeding", "heavily"],
      ["heavy", "bleeding"],
      ["bleeding", "lot"],
      ["stop", "bleeding"],
      ["losing", "blood"],
      ["vomiting", "blood"],
      ["coughing", "blood"],
      ["khoon", "band", "nahi"],
      ["bohat", "khoon"],
      ["khoon", "ulti"],
      ["خون", "بند"],
    ],
  },
  {
    id: "poisoning",
    label: "poisoning or overdose",
    terms: [
      "overdose",
      "poisoned",
      "poisoning",
      ["swallowed", "poison"],
      ["drank", "poison"],
      // Accidental overdose is almost never called one by the person who
      // did it — "I took too many of my tablets" is how it arrives.
      ["too", "many", "tablets"],
      ["too", "many", "pills"],
      ["zyada", "goliyan"],
      "zeher",
      ["zahar", "kha"],
      "زہر",
    ],
  },
  {
    id: "self_harm",
    label: "risk of self-harm",
    terms: [
      ["kill", "myself"],
      ["end", "my", "life"],
      "suicide",
      "suicidal",
      ["harm", "myself"],
      "khudkushi",
      ["khud", "kushi"],
      "خودکشی",
    ],
  },
  {
    id: "severe_trauma",
    label: "serious injury",
    terms: [
      ["serious", "accident"],
      ["car", "accident"],
      ["road", "accident"],
      ["bone", "sticking", "out"],
      ["deep", "wound"],
      ["severe", "burn"],
      ["badly", "burned"],
      // A limb at the wrong angle after a fall is a fracture until proven
      // otherwise, and not something to book an appointment for.
      ["bent", "wrong", "way"],
      ["fell", "ladder"],
      ["fell", "roof"],
      "hadsa",
      ["gehra", "zakhm"],
      "حادثہ",
    ],
  },
  {
    id: "meningitis",
    label: "stiff neck with high fever",
    terms: [
      ["stiff", "neck"],
      ["neck", "stiffness"],
      ["gardan", "akar"],
      ["gardan", "sakht"],
      ["گردن", "اکڑ"],
    ],
  },
  {
    id: "infant_distress",
    label: "infant in distress",
    terms: [
      ["baby", "limp"],
      ["baby", "not", "feeding"],
      ["blue", "lips"],
      ["lips", "blue"],
      // "honth"/"hont"/"hoont" and "neele"/"neelay"/"nile" all occur.
      ["honth", "neele"],
      ["hont", "neele"],
      ["honth", "neelay"],
      ["ہونٹ", "نیلے"],
    ],
  },
];

export type GuardVerdict = {
  urgency: Urgency;
  /** Human-readable labels of the flags that fired, in lexicon order. */
  redFlags: string[];
  /** True when the guard raised the urgency above what the driver returned. */
  escalated: boolean;
};

/** Position in URGENCIES — the ordering that makes escalate-only enforceable. */
function rank(urgency: Urgency): number {
  return URGENCIES.indexOf(urgency);
}

/**
 * Applies the red-flag net to one classification.
 *
 * `symptoms` must be the patient's original text. Pass the model's reasoning
 * and the guard becomes a way for a driver to escalate itself, which defeats
 * the point of an independent check.
 */
export function applyRedFlagGuard(
  symptoms: string,
  driverUrgency: Urgency,
): GuardVerdict {
  const normalized = normalize(symptoms);

  const fired = RED_FLAGS.filter(
    (flag) => matchedTerms(normalized, flag.terms).length > 0,
  );

  if (fired.length === 0) {
    return { urgency: driverUrgency, redFlags: [], escalated: false };
  }

  // Escalate-only: never below what the driver already decided.
  const urgency: Urgency =
    rank(driverUrgency) >= rank("emergency") ? driverUrgency : "emergency";

  return {
    urgency,
    redFlags: fired.map((flag) => flag.label),
    escalated: rank(urgency) > rank(driverUrgency),
  };
}
