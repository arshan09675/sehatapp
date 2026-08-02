# BUILD_PLAN — work strictly in order, one phase at a time

How to use: open Claude Code in the repo, start each phase by pasting its prompt.
Use Plan Mode first for phases 3 and 4 (booking + dashboards) — review the plan
before letting it write code. Commit at every checkpoint. A phase is DONE only
when its acceptance checklist passes.

---

## Phase 0 — Repo bootstrap (half a day)

**Prompt:**
> Read CLAUDE.md fully. Initialize a Next.js 14 App Router project with TypeScript
> strict, Tailwind, and shadcn/ui matching the structure in CLAUDE.md. Set up
> Supabase client factories (browser/server/admin) using @supabase/ssr. Add the
> migration in supabase/migrations/0001_init.sql to the linked project, run
> `npx supabase db push`, then generate database.types.ts. Create a minimal landing
> page with the brand name and a "Find a Doctor" CTA. Set up ESLint + prettier.
> Do not build any features yet.

**Accept when:** `npm run build` passes, types generated, migration applied,
repo pushed to GitHub with CI-less clean build.

---

## Phase 1 — Auth + roles (2–3 days)

**Prompt:**
> Implement Supabase phone OTP auth (E.164 normalization for +92 numbers) with
> email/password as fallback. On first login, a profile row already exists via the
> DB trigger — build a complete-your-profile step (full name). Implement role-based
> routing middleware: patient → /dashboard, doctor → /doctor, admin → /admin.
> Build the auth UI (login, OTP verify, logout) with loading and error states.
> Seed one admin user via documented manual SQL.

**Accept when:** can sign up with phone OTP on a real number, wrong OTP shows a
proper error, roles route correctly, session persists.

---

## Phase 2 — Admin: clinics + doctors + verification (3–4 days)

**Prompt:**
> Build the /admin area: CRUD for clinics; create doctor accounts (creates auth
> user + doctors row) with photo upload to Supabase Storage; a verification queue
> where admin marks a doctor verified after checking the PMC number (link out to
> the PMC public register), stamping verified_at/verified_by via a server action
> using the admin client. List/filter doctors by verified status. Every list has
> empty and loading states.

**Accept when:** you can onboard a real doctor end-to-end from the admin panel,
and unverified doctors are invisible to public queries.

---

## Phase 3 — Doctor dashboard: schedule manager (4–5 days) — USE PLAN MODE

**Prompt:**
> Build /doctor: profile editor (bio, photo, qualifications), clinic association
> view, and the weekly schedule manager — per clinic, per weekday: start time,
> end time, slot duration; plus schedule_exceptions (mark leave days / custom
> hours) on a small calendar. Then build the appointment list (today / upcoming /
> past tabs) with confirm, complete, no-show, cancel actions via server actions
> that enforce the status flow from CLAUDE.md. Show this dashboard beautifully —
> it is the sales demo for onboarding real doctors.

**Accept when:** a doctor can fully self-manage schedule and exceptions, and
status transitions are enforced (e.g. cannot complete a cancelled appointment).

---

## Phase 4 — Public search + booking flow (5–6 days) — USE PLAN MODE

**Prompt:**
> Build public doctor discovery: /doctors with city, area, and specialty filters
> (Postgres full-text on name+specialty), verified doctors only, cards with photo,
> fee, next-available indicator. Doctor profile page: bio, clinics, reviews, and a
> slot picker — generate slots client-visible from schedules minus exceptions
> minus booked appointments (fetch booked slots via a lightweight endpoint that
> only exposes taken slot_start times, not patient data). Booking calls the
> book_appointment RPC only. Handle every RPC error code (SLOT_TAKEN,
> DOCTOR_ON_LEAVE, INVALID_SLOT, SLOT_IN_PAST) with clear Urdu/English messages.
> If not logged in, redirect to OTP login and resume the booking. Then build the
> patient dashboard: upcoming/past appointments, cancel with reason.

**Accept when:** two browsers racing for the same slot — exactly one wins and the
other sees "slot just got taken"; booking survives login-redirect resume.

---

## Phase 5 — Notifications (2–3 days)

**Prompt:**
> Integrate SMS (provider TBD — abstract behind lib/notify.ts with a console/dev
> driver) for: booking confirmed (patient), new booking (doctor), and a reminder
> 3 hours before slot via Vercel Cron hitting an api route that reads due
> appointments. Log every send to the notifications table. Add WhatsApp Cloud API
> as a second driver behind the same interface.

**Accept when:** real SMS lands on your own phone for a real booking; cron
reminder fires in a test window; failures are logged with status='failed'.

---

## Phase 6 — Reviews + polish (2–3 days)

**Prompt:**
> Post-appointment reviews: after status=completed, patient dashboard prompts for
> rating+comment (insert allowed by RLS only for completed). Show avg rating on
> doctor cards and profile. Then a polish pass: 404/500 pages, skeletons
> everywhere, mobile nav, meta/OG tags, sitemap, robots.txt, privacy policy and
> terms pages, Sentry integration.

---

## Phase 7 — AI symptom triage (FYP research component) (4–5 days)

**Prompt:**
> Build /triage: a chat-style form where a patient describes symptoms in English
> or Roman Urdu. Server action calls the Claude API with a system prompt that
> returns strict JSON: { specialty, urgency: low|medium|emergency, reasoning }.
> On emergency, show a prominent "go to ER / call 1122" screen instead of doctor
> results. Otherwise redirect to /doctors pre-filtered by the returned specialty.
> Add a disclaimer that this is guidance, not diagnosis. Build an eval harness:
> a JSON file of 50 labeled symptom cases and a script that runs them and outputs
> an accuracy table for the FYP report.

---

## Phase 8 — Payments (post-launch)

Start with pay-at-clinic. Then: manual JazzCash verification flow (proven in TEP),
then Safepay/PayFast sandbox → live once NTN + merchant account exist. Do NOT
block launch on this phase.

---

## Working style with Claude Code (reminders to self)

- Plan Mode for anything touching booking logic or RLS; read the plan before approving.
- After every schema change: `npx supabase db push` + regenerate types + build.
- One phase per session/branch. `/clear` between phases so context stays sharp.
- Ask Claude Code to write a quick test for the slot-generation function and the
  status-transition logic — those two break silently otherwise.
- Never let it "temporarily disable RLS to make it work." That is how demos happen.
