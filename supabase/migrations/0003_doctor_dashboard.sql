-- ============================================================
-- Phase 3 — doctor dashboard
-- Status enforcement, patient visibility, leave reasons,
-- verification guard, one-schedule-row-per-weekday.
-- ============================================================

-- ---------- appointment status transitions ----------
-- The guard in src/actions/appointments.ts is not sufficient on its own:
-- appt_doctor_update has a using() clause but no with check(), so any
-- authenticated doctor can PATCH a status straight through PostgREST,
-- bypassing the server action entirely. This trigger is the real enforcement
-- point (BUILD_PLAN.md Phase 3: "status transitions are enforced").
--
--   doctor   pending   -> confirmed | cancelled
--            confirmed -> completed | no_show | cancelled
--   patient  pending | confirmed -> cancelled   (own rows only)
--
-- completed / cancelled / no_show are terminal for everyone.

create or replace function enforce_appointment_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  -- Service-role connections (auth.uid() is null) and admins bypass, so
  -- trusted server code and manual correction of mistakes stay possible.
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if old.status in ('completed', 'cancelled', 'no_show') then
    raise exception 'ILLEGAL_STATUS_TRANSITION'
      using detail = format('%s is terminal (attempted -> %s)',
                            old.status, new.status);
  end if;

  -- The patient on the row may only cancel it.
  if auth.uid() = old.patient_id then
    if new.status <> 'cancelled' then
      raise exception 'ILLEGAL_STATUS_TRANSITION'
        using detail = format('patient may only cancel (attempted %s -> %s)',
                              old.status, new.status);
    end if;
    return new;
  end if;

  if old.doctor_id is distinct from current_doctor_id() then
    raise exception 'ILLEGAL_STATUS_TRANSITION'
      using detail = 'caller is neither the patient nor the doctor on this row';
  end if;

  if old.status = 'pending'
     and new.status not in ('confirmed', 'cancelled') then
    raise exception 'ILLEGAL_STATUS_TRANSITION'
      using detail = format('pending -> %s', new.status);
  end if;

  if old.status = 'confirmed'
     and new.status not in ('completed', 'no_show', 'cancelled') then
    raise exception 'ILLEGAL_STATUS_TRANSITION'
      using detail = format('confirmed -> %s', new.status);
  end if;

  return new;
end;
$$;

-- `of status` keeps the guard off unrelated column updates (cancel_reason,
-- the updated_at touch, …).
create trigger appointments_status_guard
  before update of status on appointments
  for each row execute function enforce_appointment_status_transition();

-- ---------- doctors can read their own patients' profiles ----------
-- profiles_select_own limits profiles to (id = auth.uid() or is_admin()), and
-- RLS applies to embedded selects too — so a doctor reading
-- appointments -> patient:profiles!patient_id(full_name, phone) gets null
-- back. The appointment list shows exactly those two fields, so grant exactly
-- that much: profiles of patients who hold an appointment with the caller.
--
-- security definer (matching is_admin / current_doctor_id) so evaluating a
-- policy on profiles does not re-enter RLS on appointments.
create or replace function doctor_treats_patient(p_patient uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from appointments a
     where a.patient_id = p_patient
       and a.doctor_id = current_doctor_id()
  );
$$;

-- Additive: multiple permissive SELECT policies are OR'd together, so
-- profiles_select_own keeps working unchanged.
create policy "profiles_doctor_reads_patients" on profiles for select
  using (doctor_treats_patient(id));

-- ---------- leave reasons ----------
-- The leave panel shows a reason under each blocked date
-- ("Independence Day — clinic closed").
alter table schedule_exceptions add column reason text;

-- ---------- verification stays admin-only ----------
-- doctors_self_update lets a doctor update their own row and has no
-- with check() and no column guard, so nothing stopped a doctor setting
-- is_verified = true and becoming publicly bookable — 0001_init.sql:291-292
-- flagged this and deferred it. The Phase 3 profile editor whitelists the
-- columns it writes, but the hole is reachable directly from PostgREST, so
-- close it at the database.
--
-- The `auth.uid() is null` bypass is load-bearing: the Phase 2 verifyDoctor
-- action runs on the service-role client, where auth.uid() is null AND
-- is_admin() is false. Without it, admin verification breaks.
create or replace function guard_doctor_verification_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by then
    raise exception 'VERIFICATION_IS_ADMIN_ONLY';
  end if;

  return new;
end;
$$;

create trigger doctors_verification_guard
  before update on doctors
  for each row execute function guard_doctor_verification_columns();

-- ---------- one schedule row per clinic per weekday ----------
-- The schedule manager owns exactly one row per weekday and saves the whole
-- week with upsert(onConflict: 'doctor_clinic_id,day_of_week'). 0001_init.sql
-- allowed duplicate and overlapping rows for the same day, which
-- book_appointment then resolved arbitrarily via `limit 1`.
delete from schedules s
 using schedules t
 where s.doctor_clinic_id = t.doctor_clinic_id
   and s.day_of_week = t.day_of_week
   and s.ctid > t.ctid;

alter table schedules
  add constraint schedules_one_row_per_day
  unique (doctor_clinic_id, day_of_week);
