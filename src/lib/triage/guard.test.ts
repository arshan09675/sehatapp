import { describe, expect, it } from "vitest";

import { applyRedFlagGuard } from "./guard";

describe("applyRedFlagGuard", () => {
  it("leaves an ordinary complaint alone", () => {
    const verdict = applyRedFlagGuard("itchy rash on my arms", "low");
    expect(verdict.urgency).toBe("low");
    expect(verdict.escalated).toBe(false);
    expect(verdict.redFlags).toEqual([]);
  });

  // The reason the guard exists: a model that under-rates chest pain must not
  // be able to route someone to a booking page.
  it("escalates a red flag the driver rated low", () => {
    const verdict = applyRedFlagGuard(
      "chest pain and I cannot breathe properly",
      "low",
    );
    expect(verdict.urgency).toBe("emergency");
    expect(verdict.escalated).toBe(true);
    expect(verdict.redFlags).toContain("chest pain");
    expect(verdict.redFlags).toContain("difficulty breathing");
  });

  it("escalates from medium too", () => {
    expect(applyRedFlagGuard("I passed out at work", "medium").urgency).toBe(
      "emergency",
    );
  });

  // Escalate-only. A lexicon that happens not to list the patient's phrasing
  // must never talk a driver down from emergency.
  it("never de-escalates", () => {
    const verdict = applyRedFlagGuard("mild headache for a day", "emergency");
    expect(verdict.urgency).toBe("emergency");
    expect(verdict.escalated).toBe(false);
  });

  it("does not double-report when the driver already said emergency", () => {
    const verdict = applyRedFlagGuard("severe chest pain", "emergency");
    expect(verdict.urgency).toBe("emergency");
    expect(verdict.escalated).toBe(false);
    expect(verdict.redFlags).toContain("chest pain");
  });

  describe("Roman Urdu", () => {
    const cases: ReadonlyArray<[text: string, flag: string]> = [
      ["seene mein dard ho raha hai", "chest pain"],
      ["saans nahi aa raha", "difficulty breathing"],
      ["behosh ho gaya tha", "loss of consciousness"],
      ["khoon band nahi ho raha", "heavy bleeding"],
      ["mujhe lagta hai falij ho gaya", "stroke signs"],
      ["usne zeher pi liya hai", "poisoning or overdose"],
      ["khudkushi ka khayal aata hai", "risk of self-harm"],
    ];

    for (const [text, flag] of cases) {
      it(`catches "${text}"`, () => {
        const verdict = applyRedFlagGuard(text, "low");
        expect(verdict.urgency).toBe("emergency");
        expect(verdict.redFlags).toContain(flag);
      });
    }
  });

  describe("spelling and script variation", () => {
    it("survives repeated vowels and punctuation", () => {
      expect(applyRedFlagGuard("SEENE MEIN DAARD!!!", "low").urgency).toBe(
        "emergency",
      );
    });

    it("catches Urdu script", () => {
      expect(applyRedFlagGuard("سینے میں درد", "low").urgency).toBe(
        "emergency",
      );
    });
  });

  // Words that contain a red-flag term must not trip it. "Sardar" is a common
  // name; "accident" alone is too broad to mean an emergency.
  it("does not fire on unrelated text", () => {
    expect(applyRedFlagGuard("my name is Sardar Ali", "low").urgency).toBe(
      "low",
    );
    expect(applyRedFlagGuard("I need a routine check-up", "low").urgency).toBe(
      "low",
    );
  });
});
