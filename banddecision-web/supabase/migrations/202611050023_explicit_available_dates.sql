-- Opt-in available dates: old unavailability is archived, never inferred as availability.
begin;
create table public.available_dates (
 band_id uuid not null references public.bands(id) on delete cascade,
 member_id uuid not null, available_date date not null,
 updated_at timestamptz not null default now(),
 primary key(member_id,available_date),
 foreign key(member_id,band_id) references public.band_members(id,band_id) on delete cascade
);
create index available_dates_band_day on public.available_dates(band_id,available_date,member_id);
alter table public.available_dates enable row level security;
revoke all on public.available_dates from public,anon,authenticated;
grant select on public.available_dates to authenticated;
create policy available_dates_band_read on public.available_dates for select to authenticated using(private.is_band_member(band_id));
create trigger live_available_changes after insert or update or delete on public.available_dates for each row execute function private.bump_band_planning();

create function public.save_band_availability(p_dates jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid; item jsonb; dt date; today date:=(now() at time zone 'Asia/Seoul')::date;
 last_day date:= (date_trunc('month',(now() at time zone 'Asia/Seoul'))+interval '2 months - 1 day')::date;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.band_members where id=m and band_id=b and status='active' and user_id=private.actor_id()) then raise exception 'FORBIDDEN'; end if;
 if p_dates is null or jsonb_typeof(p_dates)<>'array' then raise exception 'INVALID_INPUT'; end if;
 if jsonb_array_length(p_dates) not between 1 and 366 then raise exception 'INVALID_INPUT'; end if;
 for item in select value from jsonb_array_elements(p_dates) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'INVALID_INPUT'; end if;
  begin dt:=(item->>'date')::date; exception when others then raise exception 'INVALID_INPUT'; end;
  if dt not between today and last_day then raise exception 'INVALID_INPUT'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_dates) e group by e->>'date' having count(*)>1) then raise exception 'DUPLICATE_CONFLICT'; end if;
 -- Idempotent additions: concurrent month selections never remove another saved day.
 insert into public.available_dates(band_id,member_id,available_date)
 select b,m,(e->>'date')::date from jsonb_array_elements(p_dates) e
 on conflict(member_id,available_date) do nothing;
end $$;
create function public.update_band_availability(p_date date,p_new_date date) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid; today date:=(now() at time zone 'Asia/Seoul')::date;
 last_day date:=(date_trunc('month',(now() at time zone 'Asia/Seoul'))+interval '2 months - 1 day')::date;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.band_members where id=m and band_id=b and status='active' and user_id=private.actor_id()) then raise exception 'FORBIDDEN'; end if;
 if p_date is null or p_new_date is null or (p_date<>p_new_date and p_new_date not between today and last_day) then raise exception 'INVALID_INPUT'; end if;
 if p_date<>p_new_date and exists(select 1 from public.available_dates where member_id=m and available_date=p_new_date) then raise exception 'DATE_ALREADY_SAVED'; end if;
 update public.available_dates set available_date=p_new_date,updated_at=now() where band_id=b and member_id=m and available_date=p_date;
 if not found then raise exception 'DATE_NOT_FOUND'; end if;
end $$;
create function public.delete_band_availability(p_date date) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.band_members where id=m and band_id=b and status='active' and user_id=private.actor_id()) then raise exception 'FORBIDDEN'; end if;
 delete from public.available_dates where band_id=b and member_id=m and available_date=p_date;
 if not found then raise exception 'DATE_NOT_FOUND'; end if;
end $$;
revoke all on function public.save_band_availability(jsonb),public.update_band_availability(date,date),public.delete_band_availability(date) from public,anon;
grant execute on function public.save_band_availability(jsonb),public.update_band_availability(date,date),public.delete_band_availability(date) to authenticated;
-- Old records remain readable under their existing RLS, but stale clients cannot write them.
revoke all on function public.save_band_unavailability(jsonb),public.update_band_unavailability(date,date,text),public.delete_band_unavailability(date) from public,anon,authenticated;

create or replace function public.band_planning_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; me uuid; result jsonb;
begin
 select band_id,id into b,me from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('band_id',b,'skill_enabled',bands.skill_enabled,'version',bands.planning_version,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',m.skill) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
  'available',coalesce((select jsonb_agg(jsonb_build_object('memberId',d.member_id,'date',d.available_date) order by d.available_date,d.member_id) from public.available_dates d join public.band_members m on m.id=d.member_id and m.status='active' where d.band_id=b),'[]'::jsonb),
  'songs',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'artist',s.artist,'confirmedAt',s.confirmed_at,
   'difficulties',coalesce((select jsonb_object_agg(d.part_key,d.difficulty) from public.song_difficulties d where d.song_id=s.id),'{}'::jsonb),
   'difficultyMeta',coalesce((select jsonb_object_agg(d.part_key,jsonb_build_object('version',d.version,'updatedAt',d.updated_at,'updatedBy',p.nickname)) from public.song_difficulties d left join public.profiles p on p.id=d.updated_by where d.song_id=s.id),'{}'::jsonb),
   'votes',coalesce((select jsonb_agg(jsonb_build_object('memberId',v.member_id,'choice',v.choice,'reason',v.reason)) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=s.id),'[]'::jsonb)
  ) order by s.id) from public.songs s where s.band_id=b),'[]'::jsonb)) into result from public.bands bands where bands.id=b;
 return result;
end $$;

create or replace function public.band_attendance_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; result jsonb;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('band_id',b,'skill_enabled',bands.skill_enabled,'version',bands.planning_version,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',m.skill) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
  'available',coalesce((select jsonb_agg(jsonb_build_object('memberId',d.member_id,'date',d.available_date) order by d.available_date,d.member_id) from public.available_dates d join public.band_members m on m.id=d.member_id and m.status='active' where d.band_id=b),'[]'::jsonb))
 into result from public.bands bands where bands.id=b;return result;
end $$;

create or replace function public.band_song_context(p_song bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; enabled boolean; result jsonb;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select skill_enabled into enabled from public.bands where id=b;
 select jsonb_build_object('band_id',b,'skill_enabled',enabled,'version',bands.planning_version,
 'available','[]'::jsonb,
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',case when enabled then m.skill else null end) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
 'songs',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'artist',s.artist,'confirmedAt',s.confirmed_at,
 'difficulties',case when enabled then coalesce((select jsonb_object_agg(d.part_key,d.difficulty) from public.song_difficulties d where d.song_id=s.id),'{}'::jsonb) else '{}'::jsonb end,
 'difficultyMeta',case when enabled and p_song is not null then coalesce((select jsonb_object_agg(d.part_key,jsonb_build_object('version',d.version,'updatedAt',d.updated_at,'updatedBy',p.nickname)) from public.song_difficulties d left join public.profiles p on p.id=d.updated_by where d.song_id=s.id),'{}'::jsonb) else '{}'::jsonb end,
 'votes',coalesce((select jsonb_agg(jsonb_build_object('memberId',v.member_id,'choice',v.choice,'reason',case when p_song is not null then v.reason else null end)) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.band_id=b and m.status='active' where v.song_id=s.id and v.band_id=b),'[]'::jsonb)
 ) order by s.id) from public.songs s where s.band_id=b and (p_song is null or s.id=p_song)),'[]'::jsonb)) into result from public.bands bands where bands.id=b;
 return result;
end $$;

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
 'upcoming_available',coalesce((select jsonb_agg(d.available_date order by d.available_date) from public.available_dates d where d.band_id=b and d.member_id=m and d.available_date>=today),'[]'::jsonb),
 'upcoming_plan_count',(select count(*) from public.confirmed_plans where band_id=b and rehearsal_date>=today),
 'next_plan',(select jsonb_build_object('id',cp.id,'rehearsal_date',cp.rehearsal_date,'location',cp.location,'memo',left(cp.memo,600),'starts_at',cp.starts_at,'ends_at',cp.ends_at,'participant_count',cp.participant_count,'attendee_count',cp.attendee_count,
 'confirmed_plan_songs',coalesce((select jsonb_agg(jsonb_build_object('title_snapshot',s.title_snapshot) order by s.display_order) from public.confirmed_plan_songs s where s.plan_id=cp.id),'[]'::jsonb))
 from public.confirmed_plans cp where cp.band_id=b and cp.rehearsal_date>=today order by cp.rehearsal_date,cp.confirmed_at,cp.id limit 1)) into result;
 return result;
end $$;

create or replace function public.save_rehearsal_plan(p_band uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_plan uuid,p_expected_plan_version integer,p_ack_partial boolean,p_location text,p_memo text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v bigint; old_plan public.confirmed_plans%rowtype; saved_songs jsonb:='[]'; n int; attend int; song bigint; plan uuid; snapshot jsonb;
begin
 perform 1 from public.bands where id=p_band for update;
 if not found or not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
 if char_length(coalesce(p_location,''))>200 or char_length(coalesce(p_memo,''))>2000 then raise exception 'INVALID_INPUT'; end if;
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
 select count(*) into attend from public.band_members m where m.band_id=p_band and m.status='active' and exists(select 1 from public.available_dates d where d.member_id=m.id and d.band_id=p_band and d.available_date=p_date);
 if attend=0 then raise exception 'NO_ATTENDEES'; end if;
 if attend<n and not coalesce(p_ack_partial,false) then raise exception 'PARTIAL_ACK_REQUIRED'; end if;
 foreach song in array p_song_ids loop
  if exists(select 1 from jsonb_array_elements(saved_songs) s where (s->>'source_song_id')::bigint=song) then continue; end if;
  if exists(select 1 from public.songs where id=song and band_id=p_band and confirmed_at is not null) then continue; end if;
  if not exists(select 1 from public.songs where id=song and band_id=p_band)
   or (select count(*) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=song and v.band_id=p_band)<>n
   or (select count(*) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=song and v.band_id=p_band and v.choice='yes')<(2*n+2)/3
   or ((select skill_enabled from public.bands where id=p_band) and exists(select 1 from public.band_members m where m.band_id=p_band and m.status='active' and m.skill is null))
   or ((select skill_enabled from public.bands where id=p_band) and exists(select 1 from public.band_members m where m.band_id=p_band and m.status='active' and not exists(select 1 from public.song_difficulties d where d.song_id=song and d.part_key=m.part_key))) then raise exception 'SONG_NOT_ELIGIBLE'; end if;
 end loop;
 if p_plan is null then
  insert into public.confirmed_plans(band_id,rehearsal_date,participant_count,attendee_count,confirmed_by,location,memo) values(p_band,p_date,n,attend,private.actor_id(),nullif(btrim(p_location),''),nullif(btrim(p_memo),'')) returning id into plan;
 else
  plan:=p_plan;
  update public.confirmed_plans set location=nullif(btrim(p_location),''),memo=nullif(btrim(p_memo),''),rehearsal_date=p_date,participant_count=n,attendee_count=attend,confirmed_by=private.actor_id(),confirmed_at=now(),version=version+1 where id=plan;
  delete from public.confirmed_plan_members where plan_id=plan;
  delete from public.confirmed_plan_songs where plan_id=plan;
 end if;
 insert into public.confirmed_plan_members(plan_id,source_member_id,nickname_snapshot,part_snapshot,attending,reason_snapshot)
 select plan,m.id,p.nickname,m.part_label,exists(select 1 from public.available_dates d where d.member_id=m.id and d.band_id=p_band and d.available_date=p_date),null::text
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

-- Sample data is seeded only on an explicit test-band preparation, never for real bands.
alter table private.test_band_fixtures add column availability_prepared boolean not null default false;
create function private.prepare_available_fixture(p_band uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ready boolean; today date:=(now() at time zone 'Asia/Seoul')::date;
 last_day date:=(date_trunc('month',(now() at time zone 'Asia/Seoul'))+interval '2 months - 1 day')::date;
begin
 if not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
 select availability_prepared into ready from private.test_band_fixtures where band_id=p_band for update;
 if not found then raise exception 'FORBIDDEN'; end if;
 if ready then return; end if;
 if exists(select 1 from public.available_dates where band_id=p_band) then
  update private.test_band_fixtures set availability_prepared=true where band_id=p_band;return;
 end if;
 if (select count(*) from public.band_members where band_id=p_band and status='active')<>5
  or (select count(*) from private.test_band_members t join public.band_members m on m.user_id=t.user_id and m.band_id=t.band_id and m.status='active' where t.band_id=p_band)<>4 then raise exception 'TEST_ROSTER_INCOMPLETE'; end if;
 insert into public.available_dates(band_id,member_id,available_date)
 select p_band,m.id,g.day::date from public.band_members m
 cross join generate_series(today::timestamp,last_day::timestamp,interval '1 day') g(day)
 where m.band_id=p_band and m.status='active'
 and not exists(select 1 from public.unavailable_dates old where old.band_id=p_band and old.member_id=m.id and old.unavailable_date=g.day::date)
 on conflict(member_id,available_date) do nothing;
 update private.test_band_fixtures set availability_prepared=true where band_id=p_band;
end $$;
revoke all on function private.prepare_available_fixture(uuid) from public,anon,authenticated;

create or replace function public.prepare_test_band() returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid; r uuid; saved uuid; v_member record; v_song record; part text; dif smallint; ver integer;
 today date:=(now() at time zone 'Asia/Seoul')::date; leader uuid:=private.actor_id();
begin
 select f.band_id,f.prepared_round_id into b,saved from private.test_band_fixtures f
 join public.bands x on x.id=f.band_id where x.leader_user_id=leader;
 if b is null then return jsonb_build_object('error','FORBIDDEN'); end if;
 perform 1 from public.bands where id=b for update;
 if not private.is_band_leader(b) then return jsonb_build_object('error','FORBIDDEN'); end if;
 select prepared_round_id into saved from private.test_band_fixtures where band_id=b;
 if saved is not null then perform private.prepare_available_fixture(b);return jsonb_build_object('ok',true); end if;
 if (select count(*) from private.test_band_members t join public.band_members roster on roster.user_id=t.user_id and roster.band_id=t.band_id and roster.status='active' where t.band_id=b)<>4
 or (select count(*) from public.band_members where band_id=b and status='active')<>5 then
  return jsonb_build_object('error','TEST_ROSTER_INCOMPLETE');
 end if;
 r:=public.start_round(b);
 for v_member in select bm.id,bm.user_id,t.slot from public.band_members bm left join private.test_band_members t on t.user_id=bm.user_id and t.band_id=bm.band_id where bm.band_id=b and bm.status='active' loop
  update public.band_members set skill=case v_member.slot when 'guitar2' then 2 when 'drums' then 4 else 3 end where id=v_member.id;
  if v_member.slot is not null then
   delete from public.unavailable_dates where member_id=v_member.id and band_id=b and unavailable_date between today and today+59;
   if v_member.slot<>'drums' then
    insert into public.unavailable_dates(band_id,member_id,unavailable_date,reason)
    values(b,v_member.id,today+case v_member.slot when 'bass' then 2 else 1 end,'[테스트] 개인 일정'),
          (b,v_member.id,today+case v_member.slot when 'guitar2' then 3 else 7 end,'[테스트] 다른 약속');
   end if;
  end if;
  update public.round_submissions set status=case when exists(select 1 from public.unavailable_dates d where d.band_id=b and d.member_id=v_member.id and d.unavailable_date between today and today+59) then 'submitted' else 'none' end,submitted_at=now()
   where round_id=r and member_id=v_member.id;
 end loop;
 for v_song in select * from public.songs where band_id=b and title in
 ('[테스트 A] 바로 추천되는 곡','[테스트 B] 내 투표를 기다리는 곡','[테스트 C] 반대로 보류되는 곡','[테스트 D] 난이도를 등록할 곡') loop
  if v_song.title not like '[테스트 D]%' then
   dif:=case when v_song.title like '[테스트 A]%' then 2 when v_song.title like '[테스트 B]%' then 3 else 5 end;
   foreach part in array array['기타','베이스','드럼','보컬'] loop
    select d.version into ver from public.song_difficulties d where d.song_id=v_song.id and d.part_key=part;
    perform public.update_song_difficulty(v_song.id,part,dif,coalesce(ver,0));
   end loop;
  end if;
  for v_member in select bm.id,bm.user_id,t.slot from public.band_members bm left join private.test_band_members t on t.user_id=bm.user_id and t.band_id=bm.band_id where bm.band_id=b and bm.status='active' loop
   if v_song.title like '[테스트 B]%' and v_member.user_id=leader then continue; end if;
   insert into public.song_votes(round_id,song_id,member_id,choice,reason)
   values(r,v_song.id,v_member.id,case when v_song.title like '[테스트 C]%' and (v_member.user_id=leader or v_member.slot='guitar2') then 'no' else 'yes' end,
    case when v_song.title like '[테스트 C]%' and (v_member.user_id=leader or v_member.slot='guitar2') then '[테스트] 연습 시간이 더 필요해요' else null end);
  end loop;
 end loop;
 update private.test_band_fixtures set prepared_round_id=r where band_id=b;
 perform private.prepare_available_fixture(b);return jsonb_build_object('ok',true);
end $$;

create or replace function public.test_band_setup_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('code',c.code,'prepared',f.prepared_round_id is not null and f.availability_prepared,
  'members',coalesce((select jsonb_agg(jsonb_build_object('slot',t.slot,'nickname',p.nickname,'part',m.part_label))
   from private.test_band_members t join public.profiles p on p.id=t.user_id
   join public.band_members m on m.user_id=t.user_id and m.band_id=t.band_id and m.status='active'
   where t.band_id=f.band_id),'[]'::jsonb))
 from private.test_band_fixtures f join public.band_members me on me.band_id=f.band_id
 join private.band_login_credentials c on c.band_id=f.band_id
 where me.user_id=private.actor_id() and me.status='active' and private.is_band_leader(f.band_id)
$$;

-- Invalidate forms rendered with the former attendance convention; do not rewrite snapshots.
update public.bands set planning_version=planning_version+1;
notify pgrst,'reload schema';
commit;
