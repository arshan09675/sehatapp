import { describe, expect, it } from "vitest";

import { extractJsonObject, parseTriageResult } from "./schema";

const valid = {
  specialty: "Dermatology",
  urgency: "low",
  reasoning: "An itchy rash on the arms is a skin complaint.",
};

describe("parseTriageResult", () => {
  it("accepts a well-formed result", () => {
    const parsed = parseTriageResult(valid);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.result.specialty).toBe("Dermatology");
  });

  // The whole reason specialty is an enum: searchDoctors folds it into a
  // tsquery, so an invented specialty is a /doctors page with no doctors on it.
  it("rejects a specialty outside the search vocabulary", () => {
    const parsed = parseTriageResult({ ...valid, specialty: "Neurology" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain("specialty");
  });

  it("rejects an urgency outside low/medium/emergency", () => {
    expect(parseTriageResult({ ...valid, urgency: "urgent" }).ok).toBe(false);
    expect(parseTriageResult({ ...valid, urgency: "LOW" }).ok).toBe(false);
  });

  it("rejects empty or missing reasoning", () => {
    expect(parseTriageResult({ ...valid, reasoning: "   " }).ok).toBe(false);
    expect(parseTriageResult({ specialty: "ENT", urgency: "low" }).ok).toBe(
      false,
    );
  });

  // .strict() rather than the default: a model that starts adding a
  // "confidence" key should fail loudly, not have it silently dropped.
  it("rejects extra keys", () => {
    const parsed = parseTriageResult({ ...valid, confidence: 0.9 });
    expect(parsed.ok).toBe(false);
  });

  it("rejects a non-object", () => {
    expect(parseTriageResult(null).ok).toBe(false);
    expect(parseTriageResult(42).ok).toBe(false);
    expect(parseTriageResult("not json at all").ok).toBe(false);
  });

  it("parses a JSON string, which is how LLM drivers answer", () => {
    const parsed = parseTriageResult(JSON.stringify(valid));
    expect(parsed.ok).toBe(true);
  });
});

describe("extractJsonObject", () => {
  // Ollama's `format` should prevent all of these, but builds before
  // structured outputs ignore it and models fence JSON out of habit.
  it("unwraps a fenced block", () => {
    expect(extractJsonObject('```json\n{"specialty":"ENT"}\n```')).toEqual({
      specialty: "ENT",
    });
  });

  it("unwraps a fence with no language tag", () => {
    expect(extractJsonObject('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignores prose around the object", () => {
    expect(
      extractJsonObject('Here is the result:\n{"a":1}\nHope that helps.'),
    ).toEqual({ a: 1 });
  });

  it("handles nested braces", () => {
    expect(extractJsonObject('{"a":{"b":2}}')).toEqual({ a: { b: 2 } });
  });

  it("returns null when there is no object", () => {
    expect(extractJsonObject("I cannot help with that.")).toBeNull();
    expect(extractJsonObject("")).toBeNull();
    expect(extractJsonObject("{ not valid json }")).toBeNull();
  });
});
