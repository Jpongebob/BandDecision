begin;
create index band_members_active_band_lookup on public.band_members(band_id,joined_at,id) where status='active';
create index songs_band_lookup on public.songs(band_id,id);
create function public.band_attendance_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; result jsonb;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('band_id',b,'version',bands.planning_version,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',m.skill) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
  'unavailable',coalesce((select jsonb_agg(jsonb_build_object('memberId',d.member_id,'date',d.unavailable_date,'reason',d.reason) order by d.unavailable_date,d.member_id) from public.unavailable_dates d join public.band_members m on m.id=d.member_id and m.status='active' where d.band_id=b),'[]'::jsonb))
 into result from public.bands bands where bands.id=b;return result;
end $$;
revoke all on function public.band_attendance_context() from public,anon;
grant execute on function public.band_attendance_context() to authenticated;
notify pgrst,'reload schema';commit;
