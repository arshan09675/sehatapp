-- ============================================================
-- Phase 5 — notifications: delivery log, idempotency, due-scan index
-- ============================================================

-- The table shipped in 0001 as a placeholder: it can record that *something*
-- was sent to a profile, but not which appointment it was about, not whether a
-- send already happened, and not why one failed. All three are load-bearing
-- now that lib/notify.ts writes to it.

alter table notifications
  -- Nullable on purpose: not every future notification is about an appointment
  -- (password handover, review requests). The dedupe index below only covers
  -- rows that have one.
  add column appointment_id uuid references appointments(id) on delete cascade,
  -- The destination as it was at send time. profiles.phone can change, and an
  -- audit trail that silently rewrites history is not an audit trail.
  add column to_addr        text,
  add column sent_at        timestamptz,
  add column error          text,
  add column provider_id    text;

-- 0001 documented `queued | sent | failed` in a comment and left the column
-- open to any string.
alter table notifications
  add constraint notifications_status_check
  check (status in ('queued', 'sent', 'failed'));

-- The idempotency gate for the reminder cron.
--
-- lib/notify.ts claims a row (status='queued') *before* calling the driver, so
-- this index — not application logic — is what stops two overlapping cron runs
-- from both sending. Failed rows fall out of the partial index, which is what
-- lets a retry re-claim after a provider outage.
--
-- profile_id is part of the key because one appointment sends the same event to
-- two people: reminder_patient and reminder_doctor are distinct templates, but
-- keeping the recipient in the key means a future shared template cannot
-- collide.
create unique index notifications_once
  on notifications (appointment_id, template, profile_id, channel)
  where appointment_id is not null and status <> 'failed';

-- The cron filters on slot_start alone. Both existing appointment indexes lead
-- with doctor_id/patient_id, so neither serves that scan.
create index appointments_due_idx
  on appointments (slot_start)
  where status in ('pending', 'confirmed');

-- Supports notif_own_read (0001) once a patient-facing history screen exists,
-- and the "what did we send about this booking" lookup while debugging.
create index notifications_profile_idx
  on notifications (profile_id, created_at desc);

-- 0001 gave this FK no ON DELETE, unlike every other profiles reference in the
-- schema. A single notification row currently makes a profile undeletable; the
-- log should follow the profile out.
alter table notifications
  drop constraint notifications_profile_id_fkey,
  add constraint notifications_profile_id_fkey
    foreign key (profile_id) references profiles(id) on delete cascade;
