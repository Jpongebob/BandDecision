-- Run this read-only query in both the old and new projects after the restore.
-- Every value except project_ref/region should match between projects.
select jsonb_build_object(
  'auth_users', (select count(*) from auth.users),
  'profiles', (select count(*) from public.profiles),
  'bands', (select count(*) from public.bands),
  'active_members', (select count(*) from public.band_members where status='active'),
  'songs', (select count(*) from public.songs),
  'song_votes', (select count(*) from public.band_song_votes),
  'available_dates', (select count(*) from public.available_dates),
  'confirmed_plans', (select count(*) from public.confirmed_plans),
  'member_pins', (select count(*) from private.member_pins),
  'login_credentials', (select count(*) from private.band_login_credentials),
  'orphan_profiles', (
    select count(*) from public.profiles p
    where not exists(select 1 from auth.users u where u.id=p.id)
  ),
  'orphan_members', (
    select count(*) from public.band_members m
    where not exists(select 1 from public.profiles p where p.id=m.user_id)
  ),
  'orphan_leaders', (
    select count(*) from public.bands b
    where not exists(select 1 from auth.users u where u.id=b.leader_user_id)
  ),
  'direct_entry_band', (
    select band_id from private.site_entry where singleton
  )
) as migration_snapshot;

-- The new project must retain the RPCs used by the deployed web client.
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
and p.proname in (
  'current_band_identity',
  'default_band_entry_context',
  'direct_member_pin_login',
  'band_home_context',
  'band_attendance_context',
  'band_song_context',
  'save_band_availability',
  'save_rehearsal_plan'
)
order by p.proname,arguments;

-- Realtime currently depends on this table being published.
select schemaname,tablename
from pg_publication_tables
where pubname='supabase_realtime'
and schemaname='public'
and tablename='band_song_votes';
