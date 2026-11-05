-- Optional member-skill scoring (off by default) and rehearsal venue.
begin;
alter table public.bands add column skill_enabled boolean not null default false;
alter table public.confirmed_plans add column location text check(char_length(location)<=200);
create function public.set_member_skill_enabled(p_enabled boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return jsonb_build_object('error','FORBIDDEN'); end if;
 perform 1 from public.bands where id=b for update;
 if not private.is_band_leader(b) then return jsonb_build_object('error','FORBIDDEN'); end if;
 if p_enabled is null then return jsonb_build_object('error','INVALID_INPUT'); end if;
 update public.bands set skill_enabled=p_enabled,planning_version=planning_version+1 where id=b and skill_enabled is distinct from p_enabled;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.set_member_skill_enabled(boolean) from public,anon;
grant execute on function public.set_member_skill_enabled(boolean) to authenticated;
create or replace function public.band_planning_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; me uuid; result jsonb;
begin
 select band_id,id into b,me from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('band_id',b,'skill_enabled',bands.skill_enabled,'version',bands.planning_version,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',m.skill) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
  'unavailable',coalesce((select jsonb_agg(jsonb_build_object('memberId',d.member_id,'date',d.unavailable_date,'reason',d.reason) order by d.unavailable_date,d.member_id) from public.unavailable_dates d join public.band_members m on m.id=d.member_id and m.status='active' where d.band_id=b),'[]'::jsonb),
  'songs',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'artist',s.artist,'confirmedAt',s.confirmed_at,
   'difficulties',coalesce((select jsonb_object_agg(d.part_key,d.difficulty) from public.song_difficulties d where d.song_id=s.id),'{}'::jsonb),
   'difficultyMeta',coalesce((select jsonb_object_agg(d.part_key,jsonb_build_object('version',d.version,'updatedAt',d.updated_at,'updatedBy',p.nickname)) from public.song_difficulties d left join public.profiles p on p.id=d.updated_by where d.song_id=s.id),'{}'::jsonb),
   'votes',coalesce((select jsonb_agg(jsonb_build_object('memberId',v.member_id,'choice',v.choice,'reason',v.reason)) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=s.id),'[]'::jsonb)
  ) order by s.id) from public.songs s where s.band_id=b),'[]'::jsonb)) into result from public.bands bands where bands.id=b;
 return result;
end $$;
create or replace function public.band_home_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; m uuid; result jsonb; today date:=(now() at time zone 'Asia/Seoul')::date;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('skill_enabled',(select skill_enabled from public.bands where id=b),'member_count',(select count(*) from public.band_members where band_id=b and status='active'),
 'pending_votes',(select count(*) from public.songs s where s.band_id=b and s.confirmed_at is null and not exists(select 1 from public.band_song_votes v where v.song_id=s.id and v.member_id=m)),
 'unset_skills',(select count(*) from public.band_members where band_id=b and status='active' and skill is null),
 'my_skill',(select skill from public.band_members where id=m),
 'upcoming_unavailable',coalesce((select jsonb_agg(d.unavailable_date order by d.unavailable_date) from public.unavailable_dates d where d.band_id=b and d.member_id=m and d.unavailable_date>=today),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.current_band_identity() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'nickname', p.nickname, 'band_id', m.band_id,
    'admin_unlocked', coalesce(private.is_band_leader(m.band_id), false),
    'code_enabled', c.band_id is not null, 'context_version', 1,
    'member', case when m.id is null then null else jsonb_build_object(
      'id', m.id, 'band_id', m.band_id, 'role', m.role, 'part_label', m.part_label) end,
    'band', case when b.id is null then null else jsonb_build_object('id', b.id, 'name', b.name,'skill_enabled',b.skill_enabled) end)
  from public.profiles p
  left join public.band_members m on m.user_id = p.id and m.status = 'active'
  left join public.bands b on b.id = m.band_id
  left join private.band_login_credentials c on c.band_id = m.band_id
  where p.id = private.actor_id()
$$;
create or replace function public.band_login_settings() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('skill_enabled',(select skill_enabled from public.bands where id=m.band_id),'code',c.code,'role',m.role,'pin_ready',pin.user_id is not null,
 'admin_unlocked',private.is_band_leader(m.band_id),
 'direct_entry_enabled',exists(select 1 from private.site_entry where singleton and band_id=m.band_id))
 from public.band_members m left join private.band_login_credentials c on c.band_id=m.band_id
 left join private.member_pins pin on pin.user_id=m.user_id
 where m.user_id=private.actor_id() and m.status='active'
$$;

create or replace function public.save_rehearsal_plan(p_band uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_plan uuid,p_expected_plan_version integer,p_ack_partial boolean,p_location text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v bigint; old_plan public.confirmed_plans%rowtype; saved_songs jsonb:='[]'; n int; attend int; song bigint; plan uuid; snapshot jsonb;
begin
 perform 1 from public.bands where id=p_band for update;
 if not found or not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
 if char_length(coalesce(p_location,''))>200 then raise exception 'INVALID_INPUT'; end if;
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
   or ((select skill_enabled from public.bands where id=p_band) and exists(select 1 from public.band_members m where m.band_id=p_band and m.status='active' and m.skill is null))
   or exists(select 1 from public.band_members m where m.band_id=p_band and m.status='active' and not exists(select 1 from public.song_difficulties d where d.song_id=song and d.part_key=m.part_key)) then raise exception 'SONG_NOT_ELIGIBLE'; end if;
 end loop;
 if p_plan is null then
  insert into public.confirmed_plans(band_id,rehearsal_date,participant_count,attendee_count,confirmed_by,location) values(p_band,p_date,n,attend,private.actor_id(),nullif(btrim(p_location),'')) returning id into plan;
 else
  plan:=p_plan;
  update public.confirmed_plans set location=nullif(btrim(p_location),''),rehearsal_date=p_date,participant_count=n,attendee_count=attend,confirmed_by=private.actor_id(),confirmed_at=now(),version=version+1 where id=plan;
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
revoke all on function public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text) from public,anon;
grant execute on function public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text) to authenticated;

-- Retain the old seven-argument API and preserve an existing location for older clients.
create or replace function public.save_rehearsal_plan(p_band uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_plan uuid,p_expected_plan_version integer,p_ack_partial boolean) returns uuid
language sql security definer set search_path='' as $$
 select public.save_rehearsal_plan(p_band,p_date,p_song_ids,p_expected_version,p_plan,p_expected_plan_version,p_ack_partial,
 (select location from public.confirmed_plans where id=p_plan and band_id=p_band))
$$;

create or replace function public.band_attendance_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; result jsonb;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('band_id',b,'skill_enabled',bands.skill_enabled,'version',bands.planning_version,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',m.skill) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
  'unavailable',coalesce((select jsonb_agg(jsonb_build_object('memberId',d.member_id,'date',d.unavailable_date,'reason',d.reason) order by d.unavailable_date,d.member_id) from public.unavailable_dates d join public.band_members m on m.id=d.member_id and m.status='active' where d.band_id=b),'[]'::jsonb))
 into result from public.bands bands where bands.id=b;return result;
end $$;
notify pgrst,'reload schema';
commit;
