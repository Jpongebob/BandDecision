-- Leader-selected repertoire is independent of rehearsal plan snapshots.
begin;
alter table public.songs add column confirmed_at timestamptz;
create function public.set_song_confirmation(p_song bigint,p_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
 select band_id into b from public.songs where id=p_song;
 if not found then raise exception 'SONG_NOT_FOUND'; end if;
 perform 1 from public.bands where id=b for update;
 if not found or not private.is_band_leader(b) then raise exception 'FORBIDDEN'; end if;
 if p_confirmed is null then raise exception 'INVALID_INPUT'; end if;
 update public.songs set confirmed_at=case when p_confirmed then coalesce(confirmed_at,now()) else null end
 where id=p_song and band_id=b and (confirmed_at is not null) is distinct from p_confirmed;
 -- Existing song trigger increments planning_version only for an actual change.
end $$;
revoke all on function public.set_song_confirmation(bigint,boolean) from public,anon;
grant execute on function public.set_song_confirmation(bigint,boolean) to authenticated;
create or replace function public.band_planning_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; me uuid; result jsonb;
begin
 select band_id,id into b,me from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('band_id',b,'version',bands.planning_version,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',m.skill) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
  'unavailable',coalesce((select jsonb_agg(jsonb_build_object('memberId',d.member_id,'date',d.unavailable_date,'reason',d.reason) order by d.unavailable_date,d.member_id) from public.unavailable_dates d join public.band_members m on m.id=d.member_id and m.status='active' where d.band_id=b),'[]'::jsonb),
  'songs',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'artist',s.artist,'confirmedAt',s.confirmed_at,
   'difficulties',coalesce((select jsonb_object_agg(d.part_key,d.difficulty) from public.song_difficulties d where d.song_id=s.id),'{}'::jsonb),
   'difficultyMeta',coalesce((select jsonb_object_agg(d.part_key,jsonb_build_object('version',d.version,'updatedAt',d.updated_at,'updatedBy',p.nickname)) from public.song_difficulties d left join public.profiles p on p.id=d.updated_by where d.song_id=s.id),'{}'::jsonb),
   'votes',coalesce((select jsonb_agg(jsonb_build_object('memberId',v.member_id,'choice',v.choice,'reason',v.reason)) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=s.id),'[]'::jsonb)
  ) order by s.id) from public.songs s where s.band_id=b),'[]'::jsonb)) into result from public.bands bands where bands.id=b;
 return result;
end $$;
create or replace function public.save_rehearsal_plan(p_band uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_plan uuid,p_expected_plan_version integer,p_ack_partial boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare v bigint; old_plan public.confirmed_plans%rowtype; saved_songs jsonb:='[]'; n int; attend int; song bigint; plan uuid; snapshot jsonb;
begin
 perform 1 from public.bands where id=p_band for update;
 if not found or not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
 select planning_version into v from public.bands where id=p_band;
 if p_expected_version is null or v<>p_expected_version then raise exception 'PLANNING_STALE'; end if;
 if p_plan is not null then
  select * into old_plan from public.confirmed_plans where id=p_plan and band_id=p_band for update;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  if p_expected_plan_version is null or old_plan.version<>p_expected_plan_version then raise exception 'PLAN_STALE'; end if;
  select coalesce(jsonb_agg(to_jsonb(s)),'[]') into saved_songs from public.confirmed_plan_songs s where plan_id=p_plan;
 elsif (select count(*) from public.confirmed_plans where band_id=p_band and rehearsal_date>=(now() at time zone 'Asia/Seoul')::date)>=5 then raise exception 'PLAN_LIMIT_REACHED'; end if;
 if p_plan is not null and old_plan.rehearsal_date<(now() at time zone 'Asia/Seoul')::date
    and p_date>=(now() at time zone 'Asia/Seoul')::date
    and (select count(*) from public.confirmed_plans where band_id=p_band and rehearsal_date>=(now() at time zone 'Asia/Seoul')::date)>=5 then raise exception 'PLAN_LIMIT_REACHED'; end if;
 if p_date is null or (p_date<(now() at time zone 'Asia/Seoul')::date and (p_plan is null or p_date is distinct from old_plan.rehearsal_date)) then raise exception 'DATE_OUT_OF_RANGE'; end if;
 if p_song_ids is null or cardinality(p_song_ids)<>(select count(distinct x) from unnest(p_song_ids) x) or exists(select 1 from unnest(p_song_ids) x where x is null or x<1) then raise exception 'INVALID_INPUT'; end if;
 select count(*) into n from public.band_members where band_id=p_band and status='active';
 if n=0 then raise exception 'NO_MEMBERS'; end if;
 select count(*) into attend from public.band_members m where m.band_id=p_band and m.status='active' and not exists(select 1 from public.unavailable_dates d where d.member_id=m.id and d.band_id=p_band and d.unavailable_date=p_date);
 if attend=0 then raise exception 'NO_ATTENDEES'; end if;
 if attend<n and not coalesce(p_ack_partial,false) then raise exception 'PARTIAL_ACK_REQUIRED'; end if;
 foreach song in array p_song_ids loop
  if exists(select 1 from jsonb_array_elements(saved_songs) s where (s->>'source_song_id')::bigint=song) then continue; end if;
  if exists(select 1 from public.songs where id=song and band_id=p_band and confirmed_at is not null) then continue; end if;
  if not exists(select 1 from public.songs where id=song and band_id=p_band)
   or (select count(*) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=song and v.band_id=p_band)<>n
   or (select count(*) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=song and v.band_id=p_band and v.choice='yes')<(2*n+2)/3
   or exists(select 1 from public.band_members m where m.band_id=p_band and m.status='active' and m.skill is null)
   or exists(select 1 from public.band_members m where m.band_id=p_band and m.status='active' and not exists(select 1 from public.song_difficulties d where d.song_id=song and d.part_key=m.part_key)) then raise exception 'SONG_NOT_ELIGIBLE'; end if;
 end loop;
 if p_plan is null then
  insert into public.confirmed_plans(band_id,rehearsal_date,participant_count,attendee_count,confirmed_by) values(p_band,p_date,n,attend,private.actor_id()) returning id into plan;
 else
  plan:=p_plan;
  update public.confirmed_plans set rehearsal_date=p_date,participant_count=n,attendee_count=attend,confirmed_by=private.actor_id(),confirmed_at=now(),version=version+1 where id=plan;
  delete from public.confirmed_plan_members where plan_id=plan;
  delete from public.confirmed_plan_songs where plan_id=plan;
 end if;
 insert into public.confirmed_plan_members(plan_id,source_member_id,nickname_snapshot,part_snapshot,attending,reason_snapshot)
 select plan,m.id,p.nickname,m.part_label,not exists(select 1 from public.unavailable_dates d where d.member_id=m.id and d.band_id=p_band and d.unavailable_date=p_date),(select reason from public.unavailable_dates d where d.member_id=m.id and d.band_id=p_band and d.unavailable_date=p_date)
 from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=p_band and m.status='active';
 for song in 1..cardinality(p_song_ids) loop
  select s into snapshot from jsonb_array_elements(saved_songs) s where (s->>'source_song_id')::bigint=p_song_ids[song];
  if found then
   insert into public.confirmed_plan_songs(plan_id,source_song_id,title_snapshot,artist_snapshot,display_order) values(plan,p_song_ids[song],snapshot->>'title_snapshot',snapshot->>'artist_snapshot',song);
  else
   insert into public.confirmed_plan_songs(plan_id,source_song_id,title_snapshot,artist_snapshot,display_order) select plan,id,title,artist,song from public.songs where id=p_song_ids[song];
  end if;
 end loop;
 update public.bands set planning_version=planning_version+1 where id=p_band;
 return plan;
end $$;
notify pgrst,'reload schema';
commit;
