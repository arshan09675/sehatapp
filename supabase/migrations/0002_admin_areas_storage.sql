-- ============================================================
-- Phase 2 — admin: areas lookup + doctor photo storage
-- ============================================================

-- ---------- areas (dropdown source for clinic forms) ----------
create table areas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text not null default 'Lahore',
  created_at  timestamptz not null default now(),
  unique (name, city)
);

alter table areas enable row level security;

create policy "areas_public_read" on areas for select using (true);
create policy "areas_admin_write" on areas for all
  using (is_admin()) with check (is_admin());

insert into areas (name, city) values
  ('Johar Town',        'Lahore'),
  ('DHA',               'Lahore'),
  ('Model Town',        'Lahore'),
  ('Gulberg',           'Lahore'),
  ('Wapda Town',        'Lahore'),
  ('Faisal Town',       'Lahore'),
  ('Allama Iqbal Town', 'Lahore');

-- ---------- doctor-photos bucket ----------
-- Public read (photos render on public doctor cards/profiles).
-- No INSERT/UPDATE/DELETE policies on purpose: writes go exclusively
-- through the service-role client inside admin/doctor server actions.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'doctor-photos',
  'doctor-photos',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "doctor_photos_public_read" on storage.objects
  for select using (bucket_id = 'doctor-photos');
