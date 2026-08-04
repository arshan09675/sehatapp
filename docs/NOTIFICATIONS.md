# Notifications — drivers, templates, and the reminder cron

Phase 5. There is no SMS account yet, so what shipped is the **seam**: a driver
interface, a console driver that prints what would go out, a database-backed
delivery log, and four wired-up moments. Adding a real provider later is one
file plus one line, and no call site changes.

Everything is imported from **`@/lib/notify`** and nothing else. The modules
behind it are private by convention:

| File                                | What it holds                                             |
| ----------------------------------- | --------------------------------------------------------- |
| `src/lib/notify.ts`                 | The facade. The only module call sites import.            |
| `src/lib/notify/types.ts`           | Channels, template ids, the `NotificationDriver` contract |
| `src/lib/notify/send.ts`            | The driver registry and the send pipeline                 |
| `src/lib/notify/templates.ts`       | Message copy, one pure renderer per template              |
| `src/lib/notify/appointments.ts`    | Appointment → recipients; the event functions             |
| `src/lib/notify/due.ts`             | Reminder-window maths (pure)                              |
| `src/lib/notify/gsm7.ts`            | SMS encoding and segment cost (pure)                      |
| `src/lib/notify/drivers/console.ts` | The development driver                                    |

## What gets sent, and when

BUILD_PLAN.md lists "booking confirmed (patient)" and "new booking (doctor)",
but a booking in this app lands as `pending` and only becomes `confirmed` when
the doctor accepts it. Sending nothing until then would contradict the landing
page, which promises "an instant SMS confirmation"
(`src/components/landing/how-it-works.tsx:14`). So booking and confirmation are
**two separate messages**, and the first is careful to say _requested_.

| Template                    | To      | Fires from                                   |
| --------------------------- | ------- | -------------------------------------------- |
| `booking_requested_patient` | patient | `bookAppointment` (`src/actions/booking.ts`) |
| `booking_requested_doctor`  | doctor  | `bookAppointment`                            |
| `booking_confirmed_patient` | patient | `updateAppointmentStatus` → `confirmed`      |
| `booking_cancelled_patient` | patient | `updateAppointmentStatus` → `cancelled`      |
| `booking_cancelled_doctor`  | doctor  | `cancelAppointment` (patient cancels)        |
| `reminder_patient`          | patient | `/api/cron/reminders`                        |
| `reminder_doctor`           | doctor  | `/api/cron/reminders`                        |

`completed` and `no_show` send nothing — both are recorded after the patient has
already been there or not.

Every send is fired inside `after()` from `next/server`, never awaited inline.
Two reasons: the patient should not wait on a provider round-trip, and Next
dispatches server actions one at a time per client, so a slow send would stall
whatever they do next. `after` still runs when the action ends in `redirect()`,
which `bookAppointment` does.

## Adding a real driver

Implement `NotificationDriver` (`src/lib/notify/types.ts`) and register it:

```ts
// src/lib/notify/send.ts
const DRIVERS: Record<string, DriverFactory> = {
  console: createConsoleDriver,
  sms: createSmsDriver, // <- the whole change
};
```

Then set `NOTIFY_DRIVER=sms`. Nothing above `send.ts` knows which driver is
configured.

A message carries **both** a rendered `body` and the structured `variables` it
was rendered from. That redundancy is deliberate and is what makes the WhatsApp
Cloud API driver a drop-in: WhatsApp does not accept free text for
business-initiated conversations, only a pre-approved template name plus ordered
parameters. An SMS driver sends `body` and ignores `variables`; a WhatsApp
driver does the reverse, mapping `message.template` to its approved template
name. Neither `templates.ts` nor any call site changes.

The `channel` a driver declares is what lands in `notifications.channel`, so a
WhatsApp driver reuses the same log table with `channel='whatsapp'` — which is
what `features.md` assumed.

## The delivery log and idempotency

`notifications` shipped in `0001` as a placeholder. `0006_notifications.sql`
made it usable: `appointment_id`, `to_addr`, `sent_at`, `error`, `provider_id`,
a real CHECK on `status`, and the index that does the actual work:

```sql
create unique index notifications_once
  on notifications (appointment_id, template, profile_id, channel)
  where appointment_id is not null and status <> 'failed';
```

The pipeline **claims a row as `queued` before calling the driver**, so the
guarantee that a reminder is not sent twice lives in Postgres, not in
application logic a retry could race. Two overlapping cron runs both try to
insert; the second gets `23505` and returns `skipped`. Failed rows fall out of
the partial index, which is what lets a retry re-claim after a provider outage.

Known trade-off: a crash between the claim and the status update strands a row
at `queued`, and that appointment's reminder never goes out. The fix is a
stale-claim sweep (`queued` older than N minutes → `failed`); it is deliberately
not built, because at this volume a stuck row is easier to spot than a
background job is to debug.

All writes use `createAdminClient()`. That is forced, not chosen —
`notifications` has one SELECT policy (`notif_own_read`) and **no INSERT or
UPDATE policy at all**, so the anon client writes nothing and reports no error.
`profiles_select_own` likewise hides every phone but your own, so the other
party's number is unreachable any other way.

Two failure modes both land as `status='failed'` with the reason in `error`:
`no_destination` (the profile has no phone on file) and whatever the driver
returned. `send()` never throws — a booking must not fail because an SMS did.

## The doctor lookup trap

`appointments.doctor_id` is `doctors.id`, **not** a profile id. Reaching a
doctor's phone is `doctors.profile_id → profiles.phone`. This is done once, in
`notify/appointments.ts`, rather than at each call site — getting it wrong would
send the doctor's SMS to whichever profile happened to share that uuid.

## SMS cost: GSM-7 vs UCS-2

A single SMS holds 160 characters in GSM-7 but only **70** in UCS-2, and one
stray character flips the whole message. The app's own formatters produce two of
them: `formatAppointmentWhen()` joins with an em dash and `doctorMetaLine()`
with a middle dot. Every rendered body therefore passes through
`normalizeForSms()`, and `templates.test.ts` asserts all seven fit one GSM-7
segment with representative Pakistani names.

Names are **not** transliterated. A doctor whose `full_name` is in Urdu script
makes the message UCS-2, and paying for a second segment beats mangling
someone's name. The console driver prints the encoding and segment count so this
is visible in development instead of on an invoice.

Message copy is English only. Adding Urdu is additive — the renderers are pure
and `i18n.ts` already carries a `ur` dictionary — but Urdu script means UCS-2 for
every message, which is a decision to make against real provider pricing.

## The reminder cron

`GET /api/cron/reminders`, scheduled hourly by `vercel.json`. It requires
`Authorization: Bearer $CRON_SECRET` (Vercel attaches this automatically once
the variable is set) and refuses to run at all if `CRON_SECRET` is unset —
the route reads every patient's appointments and spends real money once a
provider is wired.

The window runs **forward** from the lead time: `[now + 3h, now + 4h)`. A
patient is therefore warned between three and four hours ahead, never less;
erring early is the right side to err on when the reminder is competing with
Lahore traffic. Consecutive hourly runs tile exactly, and `to` is exclusive so a
boundary slot cannot be claimed by two runs.

Both are configurable, and `REMINDER_WINDOW_MINUTES` should match the cron
interval so runs tile without a gap:

```
REMINDER_LEAD_MINUTES=180
REMINDER_WINDOW_MINUTES=60
```

A typo in either falls back to the default rather than producing `NaN`, which
would match no appointments and look exactly like a quiet hour.

### ⚠ Vercel Hobby caps cron at one run per day

Hobby projects may only schedule a cron **once daily**; minute- and hour-level
schedules need Pro. On Hobby the `vercel.json` entry above will run once a day
and catch a single hour's worth of appointments — everything else silently gets
no reminder. Either upgrade, or drive the same URL from an external scheduler.
Nothing in the route changes; it only needs a GET with the bearer header.

**Supabase `pg_cron` + `pg_net`** (keeps scheduling next to the data):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('sehatbook-reminders', '0 * * * *', $$
  select net.http_get(
    url     := 'https://YOUR_DOMAIN/api/cron/reminders',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
$$);
```

Or a free external scheduler (cron-job.org, GitHub Actions on a schedule) with
the same header. Note that Vercel cron expressions are **UTC**; this route is
unaffected because the window is computed from `now`, but a future fixed-hour
schedule would be.

## Environment

```
NOTIFY_DRIVER=console          # console | (sms, whatsapp once real drivers land)
CRON_SECRET=                   # openssl rand -hex 32
REMINDER_LEAD_MINUTES=180
REMINDER_WINDOW_MINUTES=60
```

`SUPABASE_SERVICE_ROLE_KEY` is now used outside admin server actions for the
first time — the cron route has no session to check `requireRole("admin")`
against, so `CRON_SECRET` is what guards it instead.

## Verifying end to end

With `NOTIFY_DRIVER=console`, every send prints to the dev server terminal:

```
[notify:console] sms -> +923001234567
  template  booking_confirmed_patient
  encoding  GSM-7, 118 units, 1 segment
  body      SehatBook: Confirmed - Dr. Ayesha Siddiqui, ...
  vars      {"patientName":"...","doctorName":"...",...}
```

1. **Book** a slot as a patient → two blocks (patient + doctor). Check
   `notifications` has two rows, `status='sent'`, with `appointment_id` and
   `to_addr` filled.
2. **Confirm** it as that doctor → `booking_confirmed_patient`.
3. **Cancel** as the patient → `booking_cancelled_doctor`, with the reason.
4. **Reminder:** create an appointment ~3.5h out, then

   ```sh
   curl -H "Authorization: Bearer $CRON_SECRET" \
     http://localhost:3000/api/cron/reminders
   ```

   Expect `{"scanned":1,"sent":2,"skipped":0,"failed":0,...}`. Without the
   header it must return 401.

5. **Idempotency:** run the same curl again → `{"sent":0,"skipped":2}` and no
   new rows.
6. **Failure logging** (the BUILD_PLAN acceptance criterion): null a patient's
   `profiles.phone`, then book for them. A row lands with `status='failed'` and
   `error='no_destination'`, and the booking still succeeds.

## Tests

`npm test` (vitest). Three suites, all pure logic — there are no mocks anywhere
in this repo, and the modules are structured so none are needed:

- `src/lib/notify/templates.test.ts` — every id in `TEMPLATE_IDS` renders, fits
  one GSM-7 segment with a long-but-ordinary Pakistani name, leaves no
  unsubstituted placeholder, and addresses the right party (patient-facing copy
  names the doctor, doctor-facing copy names the patient). Also that the slot
  renders in Asia/Karachi — a message showing the UTC time would send patients
  to the clinic five hours early.
- `src/lib/notify/due.test.ts` — the window opens at the lead time, never gives
  less notice than it, tiles with the next run without a gap, and that a typo'd
  env value falls back instead of poisoning the window with `NaN`.
- `src/lib/notify/gsm7.test.ts` — the em dash and middle dot the app's own
  formatters emit are normalized, segment maths at the 160/153 and 70/67
  boundaries, and that names are not silently stripped.
