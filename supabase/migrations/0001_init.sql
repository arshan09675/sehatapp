-- ============================================================
-- SehatBook — initial schema
-- Source of truth. Apply with: npx supabase db push
-- ============================================================

-- ---------- enums ----------
create type user_role as enum ('patient', 'doctor', 'admin');
create type appointment_status as enum
  ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'patient',
  full_name   text not null,
  phone       text unique,                -- E.164, e.g. +923001234567
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- clinics ----------
create table clinics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  area        text not null,              -- e.g. 'Johar Town'
  city        text not null default 'Lahore',
  lat         double precision,
  lng         double precision,
  created_at  timestamptz not null default now()
);

-- ---------- doctors ----------
create table doctors (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null unique references profiles(id) on delete cascade,
  pmc_number    text not null unique,     -- verified manually vs PMC public register
  specialty     text not null,            -- keep free text now; normalize table later
  qualifications text,
  bio           text,
  photo_url     text,
  experience_years int,
  is_verified   boolean not null default false,
  verified_at   timestamptz,
  verified_by   uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index doctors_specialty_idx on doctors (specialty) where is_verified;

-- ---------- doctor <-> clinic (a doctor sits at multiple clinics) ----------
create table doctor_clinics (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references doctors(id) on delete cascade,
  clinic_id   uuid not null references clinics(id) on delete cascade,
  fee_pkr     int not null check (fee_pkr >= 0),
  unique (doctor_id, clinic_id)
);

-- ---------- weekly schedules ----------
create table schedules (
  id               uuid primary key default gen_random_uuid(),
  doctor_clinic_id uuid not null references doctor_clinics(id) on delete cascade,
  day_of_week      int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time       time not null,
  end_time         time not null,
  slot_minutes     int not null default 15 check (slot_minutes in (10,15,20,30,45,60)),
  check (end_time > start_time)
);

-- date-specific overrides (leave day, custom hours)
create table schedule_exceptions (
  id               uuid primary key default gen_random_uuid(),
  doctor_clinic_id uuid not null references doctor_clinics(id) on delete cascade,
  on_date          date not null,
  is_closed        boolean not null default true,
  start_time       time,                  -- used when is_closed = false
  end_time         time,
  unique (doctor_clinic_id, on_date)
);

-- ---------- appointments ----------
create table appointments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references profiles(id),
  doctor_id     uuid not null references doctors(id),
  clinic_id     uuid not null references clinics(id),
  slot_start    timestamptz not null,     -- UTC; display in Asia/Karachi
  slot_end      timestamptz not null,
  status        appointment_status not null default 'pending',
  fee_pkr       int not null,
  patient_note  text,
  cancel_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (slot_end > slot_start)
);

-- Hard guarantee: one live appointment per doctor per slot.
-- Cancelled slots become bookable again.
create unique index appointments_no_double_booking
  on appointments (doctor_id, slot_start)
  where status <> 'cancelled';

create index appointments_patient_idx on appointments (patient_id, slot_start desc);
create index appointments_doctor_idx  on appointments (doctor_id, slot_start desc);

-- ---------- reviews (only on completed appointments) ----------
create table reviews (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments(id) on delete cascade,
  doctor_id      uuid not null references doctors(id),
  patient_id     uuid not null references profiles(id),
  rating         int not null check (rating between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now()
);

-- ---------- notifications log (SMS/WhatsApp audit trail) ----------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id),
  channel     text not null check (channel in ('sms','whatsapp','email')),
  template    text not null,              -- e.g. 'booking_confirmed'
  payload     jsonb not null default '{}',
  status      text not null default 'queued', -- queued | sent | failed
  created_at  timestamptz not null default now()
);

-- ============================================================
-- helpers
-- ============================================================
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function current_doctor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select d.id from doctors d where d.profile_id = auth.uid();
$$;

-- updated_at trigger
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch     before update on profiles     for each row execute function touch_updated_at();
create trigger doctors_touch      before update on doctors      for each row execute function touch_updated_at();
create trigger appointments_touch before update on appointments for each row execute function touch_updated_at();

-- auto-create profile row on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.phone,
    new.email
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- book_appointment RPC — the ONLY write path for bookings
-- Advisory lock (doctor+slot) -> validate against schedule ->
-- conflict check -> insert. Race-condition proof; the partial
-- unique index is the final backstop.
-- ============================================================
create or replace function book_appointment(
  p_doctor_id  uuid,
  p_clinic_id  uuid,
  p_slot_start timestamptz,
  p_note       text default null
) returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_patient    uuid := auth.uid();
  v_dc         doctor_clinics;
  v_local_dow  int;
  v_local_date date;
  v_local_time time;
  v_sched      schedules;
  v_exc        schedule_exceptions;
  v_slot_end   timestamptz;
  v_appt       appointments;
begin
  if v_patient is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_slot_start <= now() then
    raise exception 'SLOT_IN_PAST';
  end if;

  select * into v_dc from doctor_clinics
   where doctor_id = p_doctor_id and clinic_id = p_clinic_id;
  if not found then raise exception 'DOCTOR_NOT_AT_CLINIC'; end if;

  if not exists (select 1 from doctors where id = p_doctor_id and is_verified) then
    raise exception 'DOCTOR_NOT_VERIFIED';
  end if;

  -- serialize concurrent attempts on the same doctor+slot
  perform pg_advisory_xact_lock(
    hashtext(p_doctor_id::text || p_slot_start::text)
  );

  -- validate the slot against the doctor's schedule (Asia/Karachi local time)
  v_local_dow  := extract(dow  from p_slot_start at time zone 'Asia/Karachi');
  v_local_date := (p_slot_start at time zone 'Asia/Karachi')::date;
  v_local_time := (p_slot_start at time zone 'Asia/Karachi')::time;

  select * into v_exc from schedule_exceptions
   where doctor_clinic_id = v_dc.id and on_date = v_local_date;

  if found and v_exc.is_closed then
    raise exception 'DOCTOR_ON_LEAVE';
  end if;

  select * into v_sched from schedules s
   where s.doctor_clinic_id = v_dc.id
     and s.day_of_week = v_local_dow
     and v_local_time >= s.start_time
     and v_local_time <  s.end_time
     -- slot must align to the grid
     and (extract(epoch from (v_local_time - s.start_time))::int
          % (s.slot_minutes * 60)) = 0
   limit 1;
  if not found then raise exception 'INVALID_SLOT'; end if;

  v_slot_end := p_slot_start + make_interval(mins => v_sched.slot_minutes);

  if exists (
    select 1 from appointments
     where doctor_id = p_doctor_id
       and slot_start = p_slot_start
       and status <> 'cancelled'
  ) then
    raise exception 'SLOT_TAKEN';
  end if;

  insert into appointments
    (patient_id, doctor_id, clinic_id, slot_start, slot_end, fee_pkr, patient_note)
  values
    (v_patient, p_doctor_id, p_clinic_id, p_slot_start, v_slot_end, v_dc.fee_pkr, p_note)
  returning * into v_appt;

  return v_appt;
end; $$;

-- ============================================================
-- RLS
-- ============================================================
alter table profiles            enable row level security;
alter table clinics             enable row level security;
alter table doctors             enable row level security;
alter table doctor_clinics      enable row level security;
alter table schedules           enable row level security;
alter table schedule_exceptions enable row level security;
alter table appointments        enable row level security;
alter table reviews             enable row level security;
alter table notifications       enable row level security;

-- profiles: own row, or admin
create policy "profiles_select_own"  on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_update_own"  on profiles for update
  using (id = auth.uid() or is_admin());

-- clinics: public read; admin write
create policy "clinics_public_read"  on clinics for select using (true);
create policy "clinics_admin_write"  on clinics for all
  using (is_admin()) with check (is_admin());

-- doctors: public read only when verified; doctor edits own; admin all
create policy "doctors_public_read"  on doctors for select
  using (is_verified or profile_id = auth.uid() or is_admin());
create policy "doctors_self_update"  on doctors for update
  using (profile_id = auth.uid() or is_admin());
create policy "doctors_admin_insert" on doctors for insert
  with check (is_admin());
-- note: is_verified/verified_* flips are admin-only — enforce in the admin
-- server action; optionally add a column-guard trigger later.

-- doctor_clinics + schedules: public read (needed to render slots);
-- owning doctor or admin writes
create policy "dc_public_read" on doctor_clinics for select using (true);
create policy "dc_owner_write" on doctor_clinics for all
  using (doctor_id = current_doctor_id() or is_admin())
  with check (doctor_id = current_doctor_id() or is_admin());

create policy "sched_public_read" on schedules for select using (true);
create policy "sched_owner_write" on schedules for all
  using (exists (select 1 from doctor_clinics dc
                  where dc.id = doctor_clinic_id
                    and (dc.doctor_id = current_doctor_id() or is_admin())))
  with check (exists (select 1 from doctor_clinics dc
                  where dc.id = doctor_clinic_id
                    and (dc.doctor_id = current_doctor_id() or is_admin())));

create policy "exc_public_read" on schedule_exceptions for select using (true);
create policy "exc_owner_write" on schedule_exceptions for all
  using (exists (select 1 from doctor_clinics dc
                  where dc.id = doctor_clinic_id
                    and (dc.doctor_id = current_doctor_id() or is_admin())))
  with check (exists (select 1 from doctor_clinics dc
                  where dc.id = doctor_clinic_id
                    and (dc.doctor_id = current_doctor_id() or is_admin())));

-- appointments: patient sees own; doctor sees own; admin all.
-- No direct INSERT policy — booking happens via the security-definer RPC.
create policy "appt_patient_read" on appointments for select
  using (patient_id = auth.uid()
      or doctor_id = current_doctor_id()
      or is_admin());
create policy "appt_doctor_update" on appointments for update
  using (doctor_id = current_doctor_id() or is_admin());
create policy "appt_patient_cancel" on appointments for update
  using (patient_id = auth.uid());
-- app-layer rule: patients may only set status -> 'cancelled' on their own
-- pending/confirmed rows; doctors manage confirm/complete/no_show.

-- reviews: public read; patient may insert only for own COMPLETED appointment
create policy "reviews_public_read" on reviews for select using (true);
create policy "reviews_patient_insert" on reviews for insert
  with check (
    patient_id = auth.uid()
    and exists (
      select 1 from appointments a
       where a.id = appointment_id
         and a.patient_id = auth.uid()
         and a.doctor_id = reviews.doctor_id
         and a.status = 'completed'
    )
  );

-- notifications: own rows read-only; system writes via service role
create policy "notif_own_read" on notifications for select
  using (profile_id = auth.uid() or is_admin());
