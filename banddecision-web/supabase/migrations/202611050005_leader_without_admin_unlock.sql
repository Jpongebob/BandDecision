-- Policy update: verified active leaders may administer immediately after login.
-- Keep PIN-verified identity/session expiry, membership, band ownership and role checks.
begin;
create or replace function private.is_band_leader(p_band uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.bands b
    join public.band_members m on m.band_id = b.id
      and m.user_id = b.leader_user_id and m.status = 'active' and m.role = 'leader'
    where b.id = p_band and b.leader_user_id = (select private.actor_id())
  )
$$;
-- Legacy admin_until / administrator PIN fields remain for backward compatibility.
-- They no longer gate any leader operation using is_band_leader.
notify pgrst, 'reload schema';
commit;
