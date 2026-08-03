-- ============================================================
-- Phase 4 — public search + booking
-- Public doctor identity, full-text search, taken-slot exposure.
-- ============================================================

-- ---------- public doctor identity ----------
-- profiles_select_own limits profiles to (id = auth.uid() or is_admin()), and
-- RLS applies to embedded selects too — so an anonymous visitor reading
-- doctors -> profile:profiles!profile_id(full_name) gets null back, and the
-- public doctor cards would have no name on them.
--
-- Opening profiles to the public for verified doctors is the wrong fix: RLS is
-- row-level, not column-level, so it would publish those doctors' phone and
-- email along with the name. The display name lives on `doctors` instead, kept
-- current by the triggers below, and every public query stays off `profiles`.
alter table doctors add column full_name text;

-- ---------- full-text search over name + specialty ----------
-- BUILD_PLAN Phase 4: "Postgres full-text on name+specialty".
--
-- 'simple' for names — the English stemmer mangles Urdu/Arabic-origin names.
-- 'english' for specialty and qualifications — the stemmer folds
-- "Dermatology" and "Dermatologist" onto the same lexeme, which matters
-- because the landing's specialty chips and its search dropdown use different
-- forms of every specialty.
alter table doctors add column search_tsv tsvector;

create or replace function doctors_search_vector(
  p_full_name      text,
  p_specialty      text,
  p_qualifications text
) returns tsvector
language sql immutable
as $$
  select setweight(to_tsvector('simple',  coalesce(p_full_name, '')),      'A')
      || setweight(to_tsvector('english', coalesce(p_specialty, '')),      'B')
      || setweight(to_tsvector('english', coalesce(p_qualifications, '')), 'C');
$$;

create or replace function doctors_sync_search()
returns trigger
language plpgsql
as $$
begin
  -- Pull the name from profiles only when it is missing or the owning profile
  -- changed; otherwise trust the stored copy, which profiles_name_sync keeps
  -- current. Saves a lookup on every unrelated doctors update.
  if tg_op = 'INSERT'
     or new.full_name is null
     or new.profile_id is distinct from old.profile_id then
    select p.full_name into new.full_name
      from profiles p
     where p.id = new.profile_id;
  end if;

  new.search_tsv := doctors_search_vector(
    new.full_name, new.specialty, new.qualifications
  );
  return new;
end;
$$;

create trigger doctors_search_sync
  before insert or update on doctors
  for each row execute function doctors_sync_search();

-- A doctor renaming themselves writes to profiles, not doctors. This update
-- fires doctors_search_sync above, which recomputes the vector — no recursion,
-- since that trigger only ever reads profiles.
create or replace function profiles_sync_doctor_name()
returns trigger
language plpgsql
as $$
begin
  update doctors
     set full_name = new.full_name
   where profile_id = new.id;
  return new;
end;
$$;

create trigger profiles_name_sync
  after update of full_name on profiles
  for each row
  when (new.full_name is distinct from old.full_name)
  execute function profiles_sync_doctor_name();

-- Backfill. The update fires doctors_search_sync, which populates search_tsv,
-- so there is no second pass to keep in step.
update doctors d
   set full_name = p.full_name
  from profiles p
 where p.id = d.profile_id;

-- doctors.profile_id is a not-null FK and profiles.full_name is not null, so
-- every row now has a name. Enforcing it means a broken sync fails loudly
-- instead of quietly rendering blank cards. The BEFORE trigger populates the
-- column ahead of this check on insert, so admin onboarding is unaffected.
alter table doctors alter column full_name set not null;

create index doctors_search_idx on doctors using gin (search_tsv);

-- ---------- taken slots for the public slot picker ----------
-- A visitor cannot read `appointments` at all: appt_patient_read restricts it
-- to the patient, the doctor, or an admin. The picker needs to grey out taken
-- times and nothing else about them.
--
-- security definer returning `setof timestamptz`: the return type physically
-- cannot carry patient data, so this cannot be widened by a careless edit the
-- way a `select` list on a service-role client could.
--
-- The status filter mirrors the appointments_no_double_booking partial index,
-- so what the picker greys out is exactly what book_appointment will refuse.
create or replace function taken_slots(
  p_doctor_id uuid,
  p_clinic_id uuid,
  p_from      timestamptz,
  p_to        timestamptz
) returns setof timestamptz
language sql stable security definer set search_path = public
as $$
  select a.slot_start
    from appointments a
   where a.doctor_id = p_doctor_id
     and a.clinic_id = p_clinic_id
     and a.status <> 'cancelled'
     and a.slot_start >= p_from
     and a.slot_start <  p_to
   order by a.slot_start;
$$;

grant execute on function taken_slots(uuid, uuid, timestamptz, timestamptz)
  to anon, authenticated;
