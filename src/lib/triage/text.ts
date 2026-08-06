/**
 * Text normalisation for the rule-based halves of triage (guard.ts, mock.ts).
 *
 * Roman Urdu has no fixed orthography — the same patient may write "seene",
 * "seenay" or "sine", "bukhar" or "bukhaar". Rather than chase every spelling
 * in every lexicon entry, normalise first and let the patterns stay readable:
 *
 *  - lower case, so "Bukhar" and "bukhar" are one term;
 *  - strip combining marks, so pasted Urdu-script diacritics do not split a word;
 *  - collapse repeated vowels, so "bukhaar" and "bukhar" are one term;
 *  - punctuation to spaces, so "chest-pain" and "chest, pain" both match;
 *  - pad with single spaces, so terms can be matched as whole words.
 *
 * Urdu script (U+0600–U+06FF) survives normalisation: patients who type in
 * Nastaliq should not silently classify as "no symptoms found".
 */

/**
 * Every combining mark, via the Unicode Mark property — Latin accents left by
 * NFD decomposition and Arabic/Urdu diacritics alike. Written as a property
 * escape rather than a literal character class, which would be a run of
 * invisible characters: unreviewable in a diff and easy to corrupt.
 */
const COMBINING_MARKS = /\p{M}/gu;

export function normalize(raw: string): string {
  const folded = raw
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    // Keep letters (any script) and digits; everything else separates words.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    // Repeated vowels are the most common Roman Urdu variation and the only
    // one safe to fold blindly: "bukhaar" -> "bukhar", "daard" -> "dard".
    .replace(/([aeiou])\1+/g, "$1")
    .trim()
    .replace(/\s+/g, " ");

  return folded ? ` ${folded} ` : " ";
}

/**
 * Shortest term that may take a suffix tail.
 *
 * Three-letter terms must match exactly. Learned the hard way: "jaw" with a
 * three-letter tail matches "jawab" (answer), which routed a patient reporting
 * an unconscious relative to Dentistry.
 */
const MIN_LENGTH_FOR_TAIL = 4;

/**
 * Builds a matcher for one lexicon term.
 *
 * A term of four or more letters matches as a whole word optionally followed
 * by up to three more letters. That tail is what keeps the lexicons short: one
 * entry "dard" covers "dardnak", "khansi" covers "khansiyan", "vomit" covers
 * "vomiting". Shorter terms match exactly — at three letters a tail matches
 * more unrelated words than related ones.
 *
 * Terms may contain spaces ("sar dard"), which is why this is built from the
 * term rather than using \b: word boundaries do not behave usefully in Urdu
 * script, which has neither case nor Latin word boundaries.
 */
function termPattern(term: string): RegExp {
  // The term goes through the same normalisation as the text. Without this,
  // vowel folding silently breaks every lexicon entry that spells a long
  // vowel out — "seene mein dard" would be compiled as written and could
  // never match the "sene mein dard" the normaliser produces. Lexicon authors
  // should be able to write Roman Urdu the natural way and be matched anyway.
  const normalized = normalize(term).trim();
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Length is measured on the last word: "sar dard" should still take a tail.
  const lastWord = normalized.split(" ").at(-1) ?? normalized;
  const tail = lastWord.length >= MIN_LENGTH_FOR_TAIL ? "\\p{L}{0,3}" : "";
  return new RegExp(` ${escaped}${tail} `, "u");
}

/** Cached: the lexicons are fixed and the eval replays them 50 times. */
const patterns = new Map<string, RegExp>();

function patternFor(term: string): RegExp {
  let pattern = patterns.get(term);
  if (!pattern) {
    pattern = termPattern(term);
    patterns.set(term, pattern);
  }
  return pattern;
}

/** True when `term` appears in already-normalised text. */
export function hasTerm(normalized: string, term: string): boolean {
  return patternFor(term).test(normalized);
}

/**
 * A lexicon entry: either one term, or several that must all be present
 * somewhere in the text, in any order.
 *
 * The array form exists because fixed Roman Urdu phrases are brittle. A
 * lexicon entry "seene mein dard" misses "seene mein SHADEED dard" — patients
 * put an adjective in the middle constantly, and word order moves too.
 * `["seene", "dard"]` catches both, and "chest" + "pain" catches the English
 * word order the phrase form would have needed a second entry for.
 */
export type Matcher = string | readonly string[];

/** True when every part of the matcher is present. */
export function matches(normalized: string, matcher: Matcher): boolean {
  return typeof matcher === "string"
    ? hasTerm(normalized, matcher)
    : matcher.every((part) => hasTerm(normalized, part));
}

/** How a matcher reads in output the patient sees. */
export function describeMatcher(matcher: Matcher): string {
  return typeof matcher === "string" ? matcher : matcher.join(" ");
}

/** Every matcher present in the normalised text, in lexicon order. */
export function matchedTerms(
  normalized: string,
  terms: readonly Matcher[],
): string[] {
  return terms
    .filter((matcher) => matches(normalized, matcher))
    .map(describeMatcher);
}
