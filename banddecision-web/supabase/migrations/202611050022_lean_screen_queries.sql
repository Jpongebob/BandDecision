-- Read only what the current screen displays. Existing write/authorization APIs are unchanged.
begin;
create function public.band_song_context(p_song bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; enabled boolean; result jsonb;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select skill_enabled into enabled from public.bands where id=b;
 select jsonb_build_object('band_id',b,'skill_enabled',enabled,'version',bands.planning_version,
 'unavailable','[]'::jsonb,
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',case when enabled then m.skill else null end) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
 'songs',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'artist',s.artist,'confirmedAt',s.confirmed_at,
 'difficulties',case when enabled then coalesce((select jsonb_object_agg(d.part_key,d.difficulty) from public.song_difficulties d where d.song_id=s.id),'{}'::jsonb) else '{}'::jsonb end,
 'difficultyMeta',case when enabled and p_song is not null then coalesce((select jsonb_object_agg(d.part_key,jsonb_build_object('version',d.version,'updatedAt',d.updated_at,'updatedBy',p.nickname)) from public.song_difficulties d left join public.profiles p on p.id=d.updated_by where d.song_id=s.id),'{}'::jsonb) else '{}'::jsonb end,
 'votes',coalesce((select jsonb_agg(jsonb_build_object('memberId',v.member_id,'choice',v.choice,'reason',case when p_song is not null then v.reason else null end)) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.band_id=b and m.status='active' where v.song_id=s.id and v.band_id=b),'[]'::jsonb)
 ) order by s.id) from public.songs s where s.band_id=b and (p_song is null or s.id=p_song)),'[]'::jsonb)) into result from public.bands bands where bands.id=b;
 return result;
end $$;
revoke all on function public.band_song_context(bigint) from public,anon;
grant execute on function public.band_song_context(bigint) to authenticated;

create or replace function public.band_home_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; m uuid; enabled boolean; result jsonb; today date:=(now() at time zone 'Asia/Seoul')::date;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select skill_enabled into enabled from public.bands where id=b;
 select jsonb_build_object('skill_enabled',enabled,
 'member_count',(select count(*) from public.band_members where band_id=b and status='active'),
 'pending_votes',(select count(*) from public.songs s where s.band_id=b and s.confirmed_at is null and not exists(select 1 from public.band_song_votes v where v.song_id=s.id and v.member_id=m)),
 'unset_skills',case when enabled then (select count(*) from public.band_members where band_id=b and status='active' and skill is null) else 0 end,
 'my_skill',case when enabled then (select skill from public.band_members where id=m) else null end,
 'upcoming_unavailable',coalesce((select jsonb_agg(d.unavailable_date order by d.unavailable_date) from public.unavailable_dates d where d.band_id=b and d.member_id=m and d.unavailable_date>=today),'[]'::jsonb),
 'upcoming_plan_count',(select count(*) from public.confirmed_plans where band_id=b and rehearsal_date>=today),
 'next_plan',(select jsonb_build_object('id',cp.id,'rehearsal_date',cp.rehearsal_date,'location',cp.location,'memo',left(cp.memo,600),'starts_at',cp.starts_at,'ends_at',cp.ends_at,'participant_count',cp.participant_count,'attendee_count',cp.attendee_count,
 'confirmed_plan_songs',coalesce((select jsonb_agg(jsonb_build_object('title_snapshot',s.title_snapshot) order by s.display_order) from public.confirmed_plan_songs s where s.plan_id=cp.id),'[]'::jsonb))
 from public.confirmed_plans cp where cp.band_id=b and cp.rehearsal_date>=today order by cp.rehearsal_date,cp.confirmed_at,cp.id limit 1)) into result;
 return result;
end $$;
notify pgrst,'reload schema';
commit;
