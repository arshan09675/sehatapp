# FEATURES.md — SehatBook feature roadmap

The single source of truth for what we're building and in what order. Core first,
then supply-side (doctors), then retention (patients), then research/FYP wow.

**Golden rule:** build phase by phase. Do NOT start a later feature before the
core booking loop is solid and shipped. Each feature below notes its phase,
rough effort, and the schema/implementation shape so we don't rediscover it later.

Priority key: ⭐ = do these first (highest impact per hour) · ○ = later · ◇ = nice-to-have / future work

Effort key: S = 1–2 days · M = 3–5 days · L = 1–2 weeks

---

## CORE (must exist before anything else) — already in BUILD_PLAN Phases 0–6

These are the foundation. Everything else assumes they're done.

- Auth + roles (Phase 1) ✅
- Admin: clinics, doctor onboarding, PMC verification (Phase 2) ✅
- Doctor dashboard + schedule manager (Phase 3)
- Public search + booking flow with `book_appointment` RPC (Phase 4)
- Notifications infra: SMS confirmations + reminders (Phase 5)
- Reviews on completed appointments + polish (Phase 6)

---

## TIER 1 — DOCTOR SUPPLY SIDE (this is the actual business)

### ⭐ WhatsApp reminders & confirmations — Phase 5+ · M

The killer feature for Pakistan. Cuts no-shows hard; doctors will pay for it.

- Extends the Phase 5 notify layer with a WhatsApp driver (WhatsApp Business
  Cloud API — first 1000 conversations/month free).
- Templates: booking confirmed, reminder 3h before, doctor's new-booking alert,
  post-visit review request.
- Schema: reuse `notifications` table (channel='whatsapp'). Add opt-in flag on
  profiles later if needed.
- Abstract behind `lib/notify.ts` so SMS and WhatsApp share one interface.

### ⭐ Doctor analytics dashboard — Phase 6+ · M

Makes doctors feel growth. A tab in /doctor with:

- Bookings this week/month, profile views, new vs repeat patients, peak hours,
  no-show rate.
- Schema: add a lightweight `profile_views` table (doctor_id, viewed_at) and
  derive the rest from `appointments`. Charts via recharts.
- Sales angle: this is what you show in clinic visits — "dekhein aapki growth."

### ○ Digital prescription — Phase 8+ · M

After a completed appointment, doctor writes a simple prescription → generated
PDF, sent via WhatsApp/downloadable by patient.

- Schema: `prescriptions` (appointment_id, doctor_id, patient_id, items jsonb,
  notes, created_at). Items = [{medicine, dosage, duration}].
- PDF generation server-side. Patient sees it in their history timeline.
- Makes the doctor look professional; gives patients a durable record.

### ○ Clinic queue / live token system — Phase 9+ · L

Bridges the physical clinic. Live "you are #7, ~40 min wait."

- Doctor marks patients as arrived/in-progress; patients see live position.
- Schema: add `queue_position` / `arrived_at` to appointments, or a small
  `clinic_queue` table. Realtime via Supabase Realtime channels.
- Higher complexity — only after core + Tier 1 basics are proven.

---

## TIER 2 — PATIENT RETENTION (brings people back)

### ⭐ Family profiles — Phase 6+ · M

Perfect for Pakistani households — one account books for kids, parents, spouse.

- Schema: `dependents` (id, guardian_profile_id, full_name, relation, dob,
  gender). Booking flow gains a "who is this for?" selector; appointments get
  an optional `dependent_id`.
- RLS: guardian can read/write only their own dependents' data.
- High market fit, moderate effort — strong retention lever.

### ○ Medical history timeline — Phase 6+ · S–M

All past appointments + prescriptions for a patient (and dependents) in one
place. "What happened last time" in one click.

- Mostly a well-designed read view over existing `appointments` +
  `prescriptions`. Group by person, sort by date.

### ○ Follow-up reminders — Phase 8+ · S

"Dr. asked for a follow-up in 2 weeks" → automatic reminder.

- Schema: `follow_up_date` on appointments (doctor sets it when completing).
  Cron picks due follow-ups and notifies via the notify layer.

### ◇ Saved doctors / favourites — · S

Patient can bookmark doctors for quick re-booking. Small `favourites` table.

---

## TIER 3 — RESEARCH / FYP WOW (the report's novelty)

### ⭐ AI symptom triage — Phase 7 (already planned) · M

The star FYP feature and a genuine differentiator.

- /triage chat: patient describes symptoms (English/Roman Urdu) → Claude API
  returns strict JSON { specialty, urgency: low|medium|emergency, reasoning }.
- Emergency → prominent "go to ER / call 1122" screen, not doctor results.
- Otherwise redirect to /doctors pre-filtered by specialty.
- **Eval harness:** 50 labelled symptom cases + a script that outputs an
  accuracy table — this is the measurable result panels love.
- Disclaimer: guidance, not diagnosis.

### ○ Smart doctor ranking — Phase 8+ · M

Rank search results by a composite score, not just availability.

- Score = f(rating, experience, response_time, availability, distance).
- Document the ranking algorithm in the FYP report — instant "systems" depth.
- Start heuristic (weighted sum), can evolve to learned weights later.

### ○ No-show prediction — Phase 9+ · M

Flag likely no-shows for doctors based on history.

- Features: patient's past cancel/no-show rate, lead time, first-visit vs
  follow-up, slot time. Start with a simple logistic model / heuristic.
- Shows sophistication in the report; genuinely useful to doctors.

### ◇ Video consultation (telehealth) — future work · L

Don't build WebRTC — use Daily.co or 100ms (generous free tiers).

- **Check Punjab Healthcare Commission (PHC) regulations before launching
  video consults publicly.** Likely a "future work" section in the FYP.
- Schema: `consult_type` (in_person|video) on appointments; a room URL per
  video appointment. E-prescription flows naturally after the call.

---

## Monetization (context for why the doctor features matter)

- Commission per booked appointment (Rs. 100–200).
- Doctor subscription tiers: featured listing, verified badge, WhatsApp
  reminders, analytics, video — Rs. 2–5k/month.
- Later: corporate / insurance panels.

Payments themselves: pay-at-clinic first → manual JazzCash verification (proven
in TEP) → Safepay/PayFast once NTN + merchant account exist. Never block launch
on payments.

---

## Suggested order (if you follow nothing else, follow this)

1. Finish CORE (Phases 3–6).
2. ⭐ WhatsApp reminders + ⭐ Doctor analytics (win doctors).
3. ⭐ Family profiles (win patients).
4. ⭐ AI triage + eval harness (win the FYP).
5. Everything marked ○, then ◇, as time allows.

Anything not started yet stays "future work" in the FYP report — that section
exists exactly for this, and a focused, working subset beats a broad, broken one.
