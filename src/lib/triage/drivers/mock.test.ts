import { describe, expect, it } from "vitest";

import { parseTriageResult } from "../schema";
import type { TriageResult } from "../types";
import { createMockDriver } from "./mock";

const driver = createMockDriver();

/** Classifies and validates in one step — the mock must satisfy the schema. */
async function triage(symptoms: string): Promise<TriageResult> {
  const parsed = parseTriageResult(await driver.classify({ symptoms }));
  if (!parsed.ok)
    throw new Error(`mock returned invalid output: ${parsed.error}`);
  return parsed.result;
}

describe("mock driver — specialty", () => {
  const cases: ReadonlyArray<[label: string, text: string, expected: string]> =
    [
      ["English skin", "itchy red rash spreading on my arms", "Dermatology"],
      ["Roman Urdu skin", "jild par khujli ho rahi hai", "Dermatology"],
      ["English dental", "my back tooth has been aching for days", "Dentistry"],
      ["Roman Urdu dental", "daant mein bohat dard hai", "Dentistry"],
      ["English ortho", "sharp knee pain when I climb stairs", "Orthopedics"],
      ["Roman Urdu ortho", "kamar dard se chal nahi sakta", "Orthopedics"],
      ["English ENT", "my left ear hurts and I cannot hear well", "ENT"],
      ["Roman Urdu ENT", "kaan mein dard aur sunai kam de raha hai", "ENT"],
      [
        "English gynae",
        "my periods have been irregular for months",
        "Gynecology",
      ],
      ["Roman Urdu gynae", "hamal ke doran pait mein dard", "Gynecology"],
      ["English cardio", "my heart races and skips beats", "Cardiology"],
      [
        "English GP",
        "fever and body aches since yesterday",
        "General Physician",
      ],
      [
        "Roman Urdu GP",
        "bukhar aur khansi teen din se hai",
        "General Physician",
      ],
    ];

  for (const [label, text, expected] of cases) {
    it(`${label}: "${text}"`, async () => {
      expect((await triage(text)).specialty).toBe(expected);
    });
  }

  // Who the patient is settles the specialty before what the symptom is.
  it("routes a child's fever to Pediatrics, not General Physician", async () => {
    expect(
      (await triage("my son has had a fever for two days")).specialty,
    ).toBe("Pediatrics");
    expect((await triage("mere bachay ko bukhar hai")).specialty).toBe(
      "Pediatrics",
    );
  });

  it("does not read an adult's own age as paediatric", async () => {
    expect(
      (await triage("I am a 45 year old man with chest tightness")).specialty,
    ).toBe("Cardiology");
  });

  it("falls back to General Physician when nothing matches", async () => {
    expect((await triage("I just feel off today")).specialty).toBe(
      "General Physician",
    );
  });

  // Guessing between two narrow specialties sends half those patients to the
  // wrong clinic; a GP redirects them in person.
  it("falls back to General Physician on a tie", async () => {
    expect((await triage("I have a rash and my knee hurts")).specialty).toBe(
      "General Physician",
    );
  });
});

describe("mock driver — urgency", () => {
  it("rates a routine complaint low", async () => {
    expect((await triage("small pimple on my chin")).urgency).toBe("low");
  });

  it("rates severity and duration cues medium", async () => {
    expect((await triage("severe tooth pain, cannot sleep")).urgency).toBe(
      "medium",
    );
    expect((await triage("ghutne mein dard kai din se hai")).urgency).toBe(
      "medium",
    );
  });

  it("rates red flags as an emergency", async () => {
    expect((await triage("crushing chest pain and sweating")).urgency).toBe(
      "emergency",
    );
    expect((await triage("saans nahi aa raha")).urgency).toBe("emergency");
  });
});

describe("mock driver — output contract", () => {
  it("always satisfies the schema, including on empty-ish input", async () => {
    for (const text of ["...", "hello", "aaaaa", "درد"]) {
      await expect(triage(text)).resolves.toMatchObject({
        specialty: expect.any(String),
        urgency: expect.any(String),
      });
    }
  });

  // The result card renders this. A blank reasoning would be a broken screen.
  it("never returns empty reasoning", async () => {
    const result = await triage("bukhar hai");
    expect(result.reasoning.length).toBeGreaterThan(20);
  });

  it("names what it matched, so the patient can see why", async () => {
    const result = await triage("khujli aur daane nikal aaye hain");
    expect(result.reasoning).toContain("khujli");
  });

  it("is deterministic", async () => {
    const text = "kaan mein dard hai";
    expect(await triage(text)).toEqual(await triage(text));
  });
});
