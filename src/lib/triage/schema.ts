import * as z from "zod";

import { specialties } from "../specialties";
import { URGENCIES, type TriageResult } from "./types";

/**
 * The strict JSON contract, and the one place it is defined.
 *
 * The same object does double duty: it validates whatever a driver returns,
 * and z.toJSONSchema() turns it into the constrained-decoding schema the
 * Ollama driver sends as `format`. A model that is told the schema and then
 * checked against it cannot drift from what the page renders.
 *
 * .strict() rather than the default: a chatty model that adds "confidence" or
 * "disclaimer" should be a loud validation failure, not a silently ignored
 * key that nobody notices has been arriving for weeks.
 */
export const triageResultSchema = z
  .object({
    specialty: z.enum(specialties),
    urgency: z.enum(URGENCIES),
    reasoning: z.string().trim().min(1).max(600),
  })
  .strict();

/** The JSON Schema an LLM driver constrains generation with. */
export function triageJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(triageResultSchema) as Record<string, unknown>;
}

/**
 * Pulls a JSON object out of a model's reply.
 *
 * Ollama's `format` should make this unnecessary, but it is not guaranteed:
 * builds before structured outputs ignore `format` entirely, and models
 * habitually wrap JSON in a ```json fence or introduce it with "Here is the
 * classification:". Extracting the outermost braces costs nothing and is the
 * difference between a working page and a 500 on an older Ollama.
 *
 * Returns null rather than throwing — the caller has better context for the
 * error message.
 */
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  if (!text) return null;

  // Prefer a fenced block when present; models put prose outside it that can
  // itself contain braces.
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidates = [fenced?.[1], text].filter(
    (value): value is string => typeof value === "string",
  );

  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // Try the next candidate rather than failing on the fence alone.
    }
  }
  return null;
}

/**
 * Parses and validates a driver's raw output in one step.
 *
 * Accepts either an already-structured object (the mock driver builds one
 * directly) or a string to be mined for JSON, so classify.ts has a single
 * validation path regardless of how a driver answers.
 */
export function parseTriageResult(
  raw: unknown,
): { ok: true; result: TriageResult } | { ok: false; error: string } {
  const candidate = typeof raw === "string" ? extractJsonObject(raw) : raw;

  if (candidate === null || typeof candidate !== "object") {
    return { ok: false, error: "no JSON object in the response" };
  }

  const parsed = triageResultSchema.safeParse(candidate);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { ok: false, error: detail };
  }

  return { ok: true, result: parsed.data };
}
