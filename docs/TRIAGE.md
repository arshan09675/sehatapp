# Symptom triage — drivers, the safety guard, and the eval harness

Phase 7, the FYP's research component. A patient describes symptoms at
`/triage` in English or Roman Urdu; the system returns a **specialty**, an
**urgency**, and its **reasoning** as strict JSON. Emergencies get an ER screen,
everything else gets a result card leading to `/doctors` filtered by that
specialty.

BUILD_PLAN.md specifies the Claude API. There is no key, so what shipped is the
**seam** — the same pattern Phase 5 used for notifications: a driver interface,
a zero-dependency default, a real second driver, and one validated shape between
them. Adding `claude` later is one file plus one line, and no call site changes.

Everything is imported from **`@/lib/triage`** and nothing else. The modules
behind it are private by convention:

| File                               | What it holds                                             |
| ---------------------------------- | --------------------------------------------------------- |
| `src/lib/triage.ts`                | The facade. The only module call sites import             |
| `src/lib/triage/types.ts`          | Urgency scale, the `TriageDriver` contract, `TriageError` |
| `src/lib/triage/schema.ts`         | The Zod contract, JSON extraction, validation             |
| `src/lib/triage/prompt.ts`         | The system prompt shared by every LLM driver              |
| `src/lib/triage/guard.ts`          | Red-flag lexicon, `applyRedFlagGuard()` (pure)            |
| `src/lib/triage/text.ts`           | Normalisation and term matching (pure)                    |
| `src/lib/triage/classify.ts`       | The driver registry and the classify pipeline             |
| `src/lib/triage/drivers/mock.ts`   | Keyword/rule classifier — the default                     |
| `src/lib/triage/drivers/ollama.ts` | Local Ollama driver                                       |
| `src/lib/triage/eval/`             | Labelled cases and the scoring maths                      |
| `scripts/eval-triage.ts`           | The CLI behind `npm run eval:triage`                      |

Unlike `lib/notify`, **nothing under `lib/triage/` imports `server-only`**.
It touches no database, no cookies and no request — the eval harness runs this
exact code in plain Node. The server boundary is `src/actions/triage.ts`.

## The contract

```ts
{ specialty: <one of the eight>, urgency: "low" | "medium" | "emergency", reasoning: string }
```

`specialty` is a **Zod enum over `src/lib/specialties.ts`**, not a free string.
That is not tidiness. `searchDoctors` (`src/lib/public-doctors.ts`) folds the
specialty into a `websearch_to_tsquery` rather than an equality filter, which is
why "Dermatology" finds a doctor registered as "Dermatologist" — but a model
that invents "Neurology" would send the patient to a results page with nobody on
it. The enum is what makes the redirect safe.

The schema is `.strict()`, so a model that starts adding a `confidence` key
fails loudly instead of having it silently dropped. The same schema is passed to
Ollama as its `format` via `z.toJSONSchema()`, so one definition both constrains
generation and validates the result.

### Known gap: the enum does not fully bridge to registered specialties

The enum guarantees triage emits a specialty the **chips** use. It does not
guarantee a **doctor** matches it, because doctors register free text and the
English stemmer only bridges some pairs.

It works for `Dermatology` → "Dermatologist" (both stem to `dermatolog`). It
**fails** for `Cardiology` → "cardio surgeon": `cardiology` stems to `cardiolog`,
which is not the lexeme `cardio`. Verified against the seeded doctor —
`/doctors?specialty=cardio` finds them, `/doctors?specialty=Cardiology` does not.

This is a Phase 4 search limitation, not a triage one — the landing page's
`Cardiology` chip has always had it, and triage only made it easy to notice.
Worth fixing before a demo, in one of two places:

- **Data:** register specialties using the vocabulary in
  `src/lib/specialties.ts` (admin doctor form). Cheapest, and correct for the
  PMC register anyway.
- **Search:** add a synonym dictionary to the `english` config used by
  `doctors_search_vector` (`supabase/migrations/0004_public_search_booking.sql`),
  or match specialty with `ILIKE`/prefix instead of folding it into the tsquery.

Until then, a triage result can route a patient to an empty list. The empty
state on `/doctors` handles it gracefully ("No doctors match these filters" with
a clear-filters link), so it degrades rather than breaks.

## Drivers

| `TRIAGE_DRIVER` | What it is                                    | Needs          |
| --------------- | --------------------------------------------- | -------------- |
| `mock`          | Weighted bilingual keyword rules. **Default** | nothing        |
| `ollama`        | A model on a local Ollama server              | `ollama serve` |

`mock` is a real classifier, not a stub — it scores a lexicon of English and
Roman Urdu terms per specialty, and derives urgency from red flags, severity
cues and a parsed duration ("teen din se", "for five days"). It exists so the
feature is demonstrable on a laptop with no API key and no model download.

`ollama` runs a genuine LLM locally and free:

```bash
ollama serve
ollama pull llama3.2
TRIAGE_DRIVER=ollama npm run dev
```

Both return the identical validated shape, so switching drivers changes
accuracy, not behaviour.

### Adding a real driver

Implement `TriageDriver` (`src/lib/triage/types.ts`) and register it:

```ts
// src/lib/triage/classify.ts
const DRIVERS: Record<string, DriverFactory> = {
  mock: createMockDriver,
  ollama: createOllamaDriver,
  claude: createClaudeDriver, // <- the whole change
};
```

A driver returns `unknown`. `classify()` owns extraction and validation, so a
driver cannot widen the contract by accident. Reuse `TRIAGE_SYSTEM_PROMPT` from
`prompt.ts` — the eval only compares drivers meaningfully if the prompt is not
also changing between them.

### Failures are not swallowed

`classify()` throws `TriageError` when a driver is unreachable or answers
off-schema. It does **not** fall back to `mock`. A silent swap would make the
eval meaningless — the table would mix rule-based and model rows with no way to
tell which produced which. The action turns the error into a plain-language
message with a link to `/doctors`; the eval records it as an error row and keeps
going.

## The red-flag guard

Every classification passes through `applyRedFlagGuard()`, whichever driver
produced it. If the patient's own words contain something needing emergency care
— chest pain, "saans nahi aa raha", stroke signs, "behosh", heavy bleeding,
overdose, self-harm — the urgency becomes `emergency` even when the model said
`low`.

Two rules keep it safe to run over everything:

1. **It reads the patient's text, never the model's reasoning.** Reasoning is
   model output; letting it trigger the guard would let a hallucinated sentence
   route someone to an ER screen.
2. **It can only escalate.** The comparison is by index into `URGENCIES`, so a
   driver that already said `emergency` is never talked down by a lexicon that
   happens not to list the phrasing the patient used.

Red-flag terms are mostly **co-occurrence matchers** — `["seene", "dard"]`
rather than the phrase `"seene mein dard"`. Fixed phrases shatter the moment a
patient writes "seene mein _shadeed_ dard", which is exactly how people write.

The guard is **a no-op over `mock` output by construction**, because `mock`
reuses `RED_FLAGS` as its own emergency rules. It earns its place on the LLM
drivers, where the classification is not ours. The eval reports how often it
fired so this stays visible rather than being quietly credited to the driver.

It is a keyword net, not a triage protocol. It catches phrasings that must never
be missed; it is not exhaustive, and a `medium` that stays `medium` is not
evidence that nothing is wrong.

## The eval harness

```bash
npm run eval:triage                      # the active driver
TRIAGE_DRIVER=ollama npm run eval:triage
npm run eval:triage -- --json > results.json
```

50 labelled cases in `src/lib/triage/eval/cases.json` — all eight specialties,
7 emergencies, roughly half Roman Urdu. The output gives per-specialty rows,
overall specialty/urgency/both accuracy, **emergency recall reported
separately**, false-alarm rate, guard escalations, and every miss with expected
vs predicted.

Emergency recall is pulled out on purpose: an emergency called `low` is the one
error here that can hurt somebody, and it disappears inside a single accuracy
figure that averages it against nosebleeds.

### What the numbers mean — read this before quoting them

The `mock` driver currently scores **98% specialty / 94% urgency / 92% both,
with 7/7 emergency recall and no false alarms** on these 50 cases.

**Do not report that as a model result.** The cases were written first, from
realistic patient phrasing rather than by copying lexicon terms — but the
lexicon was then debugged against them, and several genuine bugs surfaced that
way (a fixed-phrase entry that missed "seene mein shadeed dard"; `"jaw"`
matching "jawab" and routing an unconscious patient to Dentistry; no concept of
duration at all). Fixing those improved the score. That is rules being measured
on the set that shaped them, and the honest description is **an upper bound on a
keyword baseline**, not a generalisation estimate.

What the harness is actually good for:

- **Comparing drivers on a fixed set.** Run it per driver and put the tables side
  by side. `mock` is the baseline a model has to beat, and it is a much stronger
  baseline than "random" — which is itself a finding worth reporting.
- **Catching regressions.** The four remaining misses are cases needing clinical
  reasoning a keyword cannot reach ("heart pounds when I climb the stairs" has
  no severity word in it), which is a fair description of where rules stop.
- **Measuring the guard.** Escalation counts show what the safety net adds on
  top of a driver that is not ours.

For a defensible generalisation number, hold out cases the lexicon has never
seen — ideally written by somebody else, which is also the cheapest way to get
phrasing that is not already in this repo's head.

## What was deliberately not built

**No persistence.** There is no `triage_requests` table and symptom text is
never written anywhere. It is health data: storing it needs its own table, RLS
policy, retention rule and consent copy, none of which the brief asks for. The
eval harness — not production logs — is Phase 7's measurable result.

**No auth.** `/triage` is public. Someone working out which kind of doctor they
need should not have to make an account first.
