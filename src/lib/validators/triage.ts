import * as z from "zod";

/**
 * What a patient may submit to /triage.
 *
 * The minimum is 8 characters rather than 1: "dard" on its own gives the
 * classifier nothing to work with, and a result built from one word would look
 * confident while being arbitrary. Better to ask for a sentence.
 *
 * Errors follow DESIGN.md's rule — plain language, say what to do next, no
 * "Oops", no exclamation marks.
 */
export const symptomsSchema = z
  .string({ error: "Describe your symptoms so we can suggest a specialty." })
  .trim()
  .min(8, {
    error:
      "Tell us a little more — a sentence about what hurts and for how long.",
  })
  .max(1000, {
    error: "That is longer than we can read. Keep it under 1000 characters.",
  });

export const MAX_SYMPTOMS_LENGTH = 1000;
