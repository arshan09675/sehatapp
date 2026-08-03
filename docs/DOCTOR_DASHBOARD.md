# Doctor dashboard — schedule, leave, and the appointment status flow

Phase 3. Three routes under `/doctor`, all gated by `requireDoctor()`
(`src/lib/auth/dal.ts`), which requires the `doctor` role **and** a matching
`doctors` row:

| Route              | What it does                                                 |
| ------------------ | ------------------------------------------------------------ |
| `/doctor`          | Appointment list — Today / Upcoming / Past, with row actions |
| `/doctor/schedule` | Weekly timings per clinic, plus leave days                   |
| `/doctor/profile`  | Bio, photo, qualifications, and a read-only clinic list      |

## The appointment status flow

BUILD_PLAN.md refers to "the status flow from CLAUDE.md", but no such document
ever existed — `CLAUDE.md` has only ever contained `@AGENTS.md` (verified
against its full git history). The only prior statement of the rules was a
comment in `0001_init.sql`:

> app-layer rule: patients may only set status -> 'cancelled' on their own
> pending/confirmed rows; doctors manage confirm/complete/no_show.

This is the flow as built, and it is now the spec:

| From        | Doctor may set                      | Patient may set |
| ----------- | ----------------------------------- | --------------- |
| `pending`   | `confirmed`, `cancelled`            | `cancelled`     |
| `confirmed` | `completed`, `no_show`, `cancelled` | `cancelled`     |
| `completed` | — terminal                          | —               |
| `cancelled` | — terminal                          | —               |
| `no_show`   | — terminal                          | —               |

A doctor can cancel a **confirmed** appointment, not just a pending one — the
reference mockup showed only Complete/No-show there, but a doctor who falls ill
needs an escape hatch. Cancelling is the one two-step action in the UI: it
reveals a reason field, because `cancel_reason` is shown to the patient.

### Where it is enforced — three places, deliberately

1. **`src/lib/appointments.ts`** — `DOCTOR_TRANSITIONS` decides which buttons a
   row renders. Cosmetic only; never trust it.
2. **`src/actions/appointments.ts`** — the legal source statuses go into the
   `UPDATE` itself as `.in("status", allowedFrom)`, so the check and the write
   are one atomic statement with no read-then-write race.
3. **`appointments_status_guard`** (`0003_doctor_dashboard.sql`) — the real
   backstop. `appt_doctor_update` has a `using()` clause but **no
   `with check()`**, so any authenticated doctor can `PATCH` a status straight
   through PostgREST without going near the server action. Only the trigger
   stops that.

Change one of these and you must change the others.

## What migration 0003 added, and why

- `appointments_status_guard` — the trigger above.
- `doctor_treats_patient()` + `profiles_doctor_reads_patients` policy —
  `profiles_select_own` restricts `profiles` to `id = auth.uid()`, and RLS
  applies to embedded selects, so a doctor reading
  `patient:profiles!patient_id(...)` got `null`. The dashboard shows patient
  name and phone, so this grants exactly that and no more.
- `schedule_exceptions.reason` — the leave panel shows a reason line.
- `doctors_verification_guard` — `doctors_self_update` had no column guard, so
  a doctor could set their own `is_verified` and become publicly bookable.
  **The `auth.uid() is null` bypass in that trigger is load-bearing**: the
  Phase 2 `verifyDoctor` action runs on the service-role client, where
  `auth.uid()` is null _and_ `is_admin()` is false. Remove it and admin
  verification breaks.
- `unique (doctor_clinic_id, day_of_week)` on `schedules` — the manager owns
  one row per weekday and saves with `upsert(onConflict: …)`. Before this,
  duplicate rows per day were legal and `book_appointment` resolved them
  arbitrarily with `limit 1`.

## Saving the week

The whole week posts in one submit. `saveWeeklySchedule` **upserts the open
days first, then deletes the closed ones** — the two statements are not one
transaction, so the order picks the failure mode. This way a failure changes
nothing, or at worst leaves an extra open day the doctor can see and fix.
Delete-then-insert would fail with the schedule wiped.

Narrowing hours never cancels anything. Appointments are independent rows, so
after a save the action counts future booked visits that no longer land on a
slot and returns an advisory ("2 booked visits now fall outside these hours").
It is a notice, never a block — silently dropping a patient's appointment would
be indefensible.

Leave days are **full-day closures only**. `book_appointment` reads a
`schedule_exception` but acts on `is_closed` alone; its `start_time`/`end_time`
are ignored. Shipping a custom-hours control would be a UI that silently does
nothing to bookings. That lands in Phase 4 alongside the real booking flow.

## Test data

`supabase/seed.sql` is an empty stub, and appointments can only be created
through the `book_appointment` RPC — the patient booking UI does not exist
until Phase 4. To exercise the list, onboard a doctor and a clinic through
`/admin`, then insert rows directly.

Run in the Supabase SQL editor, replacing the email:

```sql
with me as (
  select d.id as doctor_id, dc.clinic_id, dc.fee_pkr
    from doctors d
    join profiles p  on p.id = d.profile_id
    join doctor_clinics dc on dc.doctor_id = d.id
   where p.email = 'doctor@example.com'
   limit 1
),
-- Any non-doctor profile will do as the patient.
someone as (select id from profiles where role = 'patient' limit 1)
insert into appointments
  (patient_id, doctor_id, clinic_id, slot_start, slot_end, status, fee_pkr, patient_note)
select
  someone.id, me.doctor_id, me.clinic_id,
  slot.start_at, slot.start_at + interval '15 minutes',
  slot.status, me.fee_pkr, slot.note
from me, someone, (values
  -- Today, in Asia/Karachi, across every status.
  ((current_date + time '15:00') at time zone 'Asia/Karachi', 'completed'::appointment_status, null),
  ((current_date + time '15:30') at time zone 'Asia/Karachi', 'confirmed',  'Improved on the last cream, needs a re-check.'),
  ((current_date + time '15:45') at time zone 'Asia/Karachi', 'pending',    null),
  ((current_date + time '16:15') at time zone 'Asia/Karachi', 'pending',    'Facial acne for the past two weeks.'),
  ((current_date + time '17:30') at time zone 'Asia/Karachi', 'cancelled',  null),
  -- Upcoming and past, for the other two tabs.
  ((current_date + 3 + time '11:00') at time zone 'Asia/Karachi', 'confirmed', null),
  ((current_date - 7 + time '10:00') at time zone 'Asia/Karachi', 'no_show',   null)
) as slot(start_at, status, note);
```

Note the partial unique index `appointments_no_double_booking` on
`(doctor_id, slot_start) where status <> 'cancelled'` — reruns need fresh
times or a `delete` first.

## Verifying enforcement

The UI hiding a button proves nothing. To confirm the trigger, sign in as the
doctor in the browser and hit PostgREST directly from the console:

```js
// Should fail: cancelled is terminal.
await supabase
  .from("appointments")
  .update({ status: "completed" })
  .eq("id", "<a cancelled appointment id>");
```

Expect `ILLEGAL_STATUS_TRANSITION`. The same call routed through the UI is
already impossible, which is the point — the trigger covers the path the UI
does not own.

Also re-check Phase 2 after any change to `doctors_verification_guard`: verify
a doctor from `/admin/verification` and confirm it still succeeds.

## Tests

`npm test` (vitest). Two suites, both pure logic, per BUILD_PLAN.md's note that
slot generation and status transitions "break silently otherwise":

- `src/lib/schedule.test.ts` — `countSlots` against the five slot counts in the
  design reference, the half-open range rule, every duration the CHECK
  constraint allows, and the exact `15-min · 12 slots` string (the separator is
  U+00B7).
- `src/lib/appointments.test.ts` — the full 5×5 transition matrix, and that
  `statusesAllowing()` is the exact inverse of `canTransition()`, since it is
  what the atomic `UPDATE` guard is built from.
