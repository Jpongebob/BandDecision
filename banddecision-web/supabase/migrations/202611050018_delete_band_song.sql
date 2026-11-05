-- Leaders can remove a song and its live votes/difficulties; saved plan snapshots remain.
begin;
create function public.delete_band_song(p_song bigint) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
 select band_id into b from public.songs where id=p_song;
 if not found then raise exception 'SONG_NOT_FOUND'; end if;
 perform 1 from public.bands where id=b for update;
 if not found or not private.is_band_leader(b) then raise exception 'FORBIDDEN'; end if;
 delete from public.songs where id=p_song and band_id=b;
 if not found then raise exception 'SONG_NOT_FOUND'; end if;
 -- Foreign keys cascade votes/difficulties; existing song trigger bumps planning_version.
 -- confirmed_plan_songs stores independent title/artist snapshots and is not deleted.
end $$;
revoke all on function public.delete_band_song(bigint) from public,anon;
grant execute on function public.delete_band_song(bigint) to authenticated;
-- Confirmed repertoire never requires another vote in home tasks.
create or replace function public.band_home_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; m uuid; result jsonb; today date:=(now() at time zone 'Asia/Seoul')::date;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('member_count',(select count(*) from public.band_members where band_id=b and status='active'),
 'pending_votes',(select count(*) from public.songs s where s.band_id=b and s.confirmed_at is null and not exists(select 1 from public.band_song_votes v where v.song_id=s.id and v.member_id=m)),
 'unset_skills',(select count(*) from public.band_members where band_id=b and status='active' and skill is null),
 'my_skill',(select skill from public.band_members where id=m),
 'upcoming_unavailable',coalesce((select jsonb_agg(d.unavailable_date order by d.unavailable_date) from public.unavailable_dates d where d.band_id=b and d.member_id=m and d.unavailable_date>=today),'[]'::jsonb)) into result;
 return result;
end $$;
notify pgrst,'reload schema';
commit;
