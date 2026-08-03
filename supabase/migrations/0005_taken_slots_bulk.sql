-- ============================================================
-- Phase 4 — batched taken-slot lookup for search results
-- ============================================================

-- taken_slots() answers for one doctor at one clinic, which is right for the
-- profile page but wrong for the results list: showing a "next available"
-- indicator on 24 cards would mean 24 round trips per search.
--
-- Same safety property as taken_slots — the return type carries ids and
-- timestamps only, so it cannot be widened into patient data by a later edit.
-- Clinic is returned rather than filtered because a doctor's next opening may
-- be at any clinic they practise at.
create or replace function taken_slots_bulk(
  p_doctor_ids uuid[],
  p_from       timestamptz,
  p_to         timestamptz
) returns table (
  doctor_id  uuid,
  clinic_id  uuid,
  slot_start timestamptz
)
language sql stable security definer set search_path = public
as $$
  select a.doctor_id, a.clinic_id, a.slot_start
    from appointments a
   where a.doctor_id = any (p_doctor_ids)
     and a.status <> 'cancelled'
     and a.slot_start >= p_from
     and a.slot_start <  p_to
   order by a.doctor_id, a.slot_start;
$$;

grant execute on function taken_slots_bulk(uuid[], timestamptz, timestamptz)
  to anon, authenticated;
