-- 2단계 화면용 규칙
-- 1) 확정된 합주 날짜는 멤버가 직접 바꿀 수 없다. 참석은 밴드장이 set_plan_attendance로 바꾼다.
-- 2) 합주 시작·끝 시간을 정할 수 있다(save_rehearsal_plan 11개 인자판 추가, 기존 9개 인자판은 그대로).
-- 3) 반대 사유는 선택이다.
-- 4) 곡 정보 수정(올린 사람·밴드장, 투표 유지, edited_at 기록)과 올린 사람의 삭제(다른 멤버 투표 전).
-- 기존 함수의 인자·반환형은 바꾸지 않으므로, 이 SQL을 먼저 적용해도 지금 배포된 화면은 그대로 동작한다.
-- 026(change_band_availability)이 먼저 적용돼 있어야 한다. 없으면 아무것도 바꾸지 않고 멈춘다.
-- 이미 적용된 DB에서 다시 실행하면 첫 create function에서 오류가 나고 역시 아무것도 바뀌지 않는다.
begin;
do $$
begin
 if to_regprocedure('public.change_band_availability(date[],date[])') is null then
  raise exception '202611070026_atomic_availability_changes.sql을 먼저 적용하세요';
 end if;
end $$;

-- 1. 확정일 잠금 ---------------------------------------------------------------
create function private.assert_dates_unlocked(p_band uuid,p_dates date[]) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if exists(select 1 from public.confirmed_plans where band_id=p_band and rehearsal_date=any(p_dates)) then raise exception 'DATE_LOCKED'; end if;
end $$;
revoke all on function private.assert_dates_unlocked(uuid,date[]) from public,anon,authenticated;

create or replace function public.save_band_availability(p_dates jsonb) returns void
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
 perform private.assert_dates_unlocked(b,array(select (e->>'date')::date from jsonb_array_elements(p_dates) e));
 -- Idempotent additions: concurrent month selections never remove another saved day.
 insert into public.available_dates(band_id,member_id,available_date)
 select b,m,(e->>'date')::date from jsonb_array_elements(p_dates) e
 on conflict(member_id,available_date) do nothing;
end $$;

create or replace function public.delete_band_availability_dates(p_dates date[]) returns integer
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid; removed integer;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.band_members where id=m and band_id=b and status='active' and user_id=private.actor_id()) then raise exception 'FORBIDDEN'; end if;
 if p_dates is null or cardinality(p_dates) not between 1 and 3660
    or exists(select 1 from unnest(p_dates) d where d is null) then raise exception 'INVALID_INPUT'; end if;
 if cardinality(p_dates)<>(select count(distinct d) from unnest(p_dates) d) then raise exception 'DUPLICATE_CONFLICT'; end if;
 perform private.assert_dates_unlocked(b,p_dates);
 delete from public.available_dates where band_id=b and member_id=m and available_date=any(p_dates);
 get diagnostics removed=row_count;
 return removed;
end $$;

create or replace function public.delete_band_availability(p_date date) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.band_members where id=m and band_id=b and status='active' and user_id=private.actor_id()) then raise exception 'FORBIDDEN'; end if;
 perform private.assert_dates_unlocked(b,array[p_date]);
 delete from public.available_dates where band_id=b and member_id=m and available_date=p_date;
 if not found then raise exception 'DATE_NOT_FOUND'; end if;
end $$;

create or replace function public.update_band_availability(p_date date,p_new_date date) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid; today date:=(now() at time zone 'Asia/Seoul')::date;
 last_day date:=(date_trunc('month',(now() at time zone 'Asia/Seoul'))+interval '2 months - 1 day')::date;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.band_members where id=m and band_id=b and status='active' and user_id=private.actor_id()) then raise exception 'FORBIDDEN'; end if;
 if p_date is null or p_new_date is null or (p_date<>p_new_date and p_new_date not between today and last_day) then raise exception 'INVALID_INPUT'; end if;
 perform private.assert_dates_unlocked(b,array[p_date,p_new_date]);
 if p_date<>p_new_date and exists(select 1 from public.available_dates where member_id=m and available_date=p_new_date) then raise exception 'DATE_ALREADY_SAVED'; end if;
 update public.available_dates set available_date=p_new_date,updated_at=now() where band_id=b and member_id=m and available_date=p_date;
 if not found then raise exception 'DATE_NOT_FOUND'; end if;
end $$;
-- change_band_availability(026)는 위 두 함수를 호출하므로 같은 잠금을 따른다.

-- 밴드장이 예정된 합주의 참석자를 직접 정한다. p_attending: 참석할 현재 멤버 id 목록.
-- 달력과 이후 계획 수정이 같은 결과를 보도록 그날의 가능한 날(available_dates)도 함께 맞춘다.
create function public.set_plan_attendance(p_plan uuid,p_expected_version integer,p_attending uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; d date; v integer; n integer; attend integer;
begin
 select band_id into b from public.confirmed_plans where id=p_plan;
 if not found then raise exception 'PLAN_NOT_FOUND'; end if;
 perform 1 from public.bands where id=b for update;
 if not private.is_band_leader(b) then raise exception 'FORBIDDEN'; end if;
 select version,rehearsal_date into v,d from public.confirmed_plans where id=p_plan and band_id=b for update;
 if not found then raise exception 'PLAN_NOT_FOUND'; end if;
 if p_expected_version is null or v<>p_expected_version then raise exception 'PLAN_STALE'; end if;
 if d<(now() at time zone 'Asia/Seoul')::date then raise exception 'DATE_OUT_OF_RANGE'; end if;
 if p_attending is null or exists(select 1 from unnest(p_attending) x where x is null)
    or cardinality(p_attending)<>(select count(distinct x) from unnest(p_attending) x)
    or exists(select 1 from unnest(p_attending) x where not exists(select 1 from public.band_members m where m.id=x and m.band_id=b and m.status='active')) then raise exception 'INVALID_INPUT'; end if;
 attend:=cardinality(p_attending);
 if attend=0 then raise exception 'NO_ATTENDEES'; end if;
 select count(*) into n from public.band_members where band_id=b and status='active';
 delete from public.available_dates a using public.band_members m
  where a.band_id=b and a.available_date=d and m.id=a.member_id and m.status='active' and a.member_id<>all(p_attending);
 insert into public.available_dates(band_id,member_id,available_date) select b,x,d from unnest(p_attending) x
  on conflict(member_id,available_date) do nothing;
 delete from public.confirmed_plan_members where plan_id=p_plan;
 insert into public.confirmed_plan_members(plan_id,source_member_id,nickname_snapshot,part_snapshot,attending,reason_snapshot)
 select p_plan,m.id,p.nickname,m.part_label,m.id=any(p_attending),null::text
 from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active';
 update public.confirmed_plans set participant_count=n,attendee_count=attend,version=version+1 where id=p_plan;
 update public.bands set planning_version=planning_version+1 where id=b;
end $$;
revoke all on function public.set_plan_attendance(uuid,integer,uuid[]) from public,anon,authenticated;
grant execute on function public.set_plan_attendance(uuid,integer,uuid[]) to authenticated;

-- 2. 합주 시간 -----------------------------------------------------------------
-- 시간은 30분 단위가 아니어도 받는다. 끝이 시작보다 이르면 다음 날 끝나는 것으로 본다(예: 22:00–00:30).
create function public.save_rehearsal_plan(p_band uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_plan uuid,p_expected_plan_version integer,p_ack_partial boolean,p_location text,p_memo text,p_starts_at time,p_ends_at time) returns uuid
language plpgsql security definer set search_path='' as $$
declare v bigint; old_plan public.confirmed_plans%rowtype; saved_songs jsonb:='[]'; n int; attend int; song bigint; plan uuid; snapshot jsonb;
begin
 perform 1 from public.bands where id=p_band for update;
 if not found or not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
 if char_length(coalesce(p_location,''))>200 or char_length(coalesce(p_memo,''))>2000 then raise exception 'INVALID_INPUT'; end if;
 if p_starts_at is null or p_ends_at is null or p_starts_at=p_ends_at then raise exception 'INVALID_INPUT'; end if;
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
  insert into public.confirmed_plans(band_id,rehearsal_date,starts_at,ends_at,participant_count,attendee_count,confirmed_by,location,memo) values(p_band,p_date,p_starts_at,p_ends_at,n,attend,private.actor_id(),nullif(btrim(p_location),''),nullif(btrim(p_memo),'')) returning id into plan;
 else
  plan:=p_plan;
  update public.confirmed_plans set location=nullif(btrim(p_location),''),memo=nullif(btrim(p_memo),''),rehearsal_date=p_date,starts_at=p_starts_at,ends_at=p_ends_at,participant_count=n,attendee_count=attend,confirmed_by=private.actor_id(),confirmed_at=now(),version=version+1 where id=plan;
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
revoke all on function public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time) from public,anon,authenticated;
grant execute on function public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time) to authenticated;

-- 3. 반대 사유 선택 ---------------------------------------------------------------
do $$
declare c text;
begin
 for c in select conname from pg_constraint where conrelid='public.band_song_votes'::regclass and contype='c' and pg_get_constraintdef(oid) like '%reason%' loop
  execute format('alter table public.band_song_votes drop constraint %I',c);
 end loop;
end $$;
alter table public.band_song_votes add constraint band_song_votes_reason_check check (
 (choice='yes' and reason is null) or (choice='no' and (reason is null or char_length(btrim(reason)) between 1 and 300)));

create or replace function public.vote_band_song(p_song bigint,p_choice text,p_reason text default null) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.songs where id=p_song and band_id=b) then raise exception 'FORBIDDEN'; end if;
 if p_choice is null or p_choice not in ('yes','no') or char_length(btrim(coalesce(p_reason,'')))>300 then raise exception 'INVALID_INPUT'; end if;
 insert into public.band_song_votes(band_id,song_id,member_id,choice,reason) values(b,p_song,m,p_choice,case when p_choice='no' then nullif(btrim(p_reason),'') else null end)
 on conflict(song_id,member_id) do update set choice=excluded.choice,reason=excluded.reason,updated_at=now();
end $$;

-- 4. 곡 정보 수정과 삭제 권한 -------------------------------------------------------
alter table public.songs add column edited_at timestamptz;

-- 올린 사람과 밴드장만 고친다. 투표는 그대로 두고 edited_at으로 '수정됨'을 표시한다. 바뀐 게 없으면 false.
create function public.update_band_song(p_song bigint,p_title text,p_artist text) returns boolean
language plpgsql security definer set search_path='' as $$
declare b uuid; author uuid; t text:=btrim(coalesce(p_title,'')); a text:=btrim(coalesce(p_artist,''));
begin
 select band_id into b from public.songs where id=p_song;
 if not found then raise exception 'SONG_NOT_FOUND'; end if;
 perform 1 from public.bands where id=b for update;
 select created_by into author from public.songs where id=p_song and band_id=b for update;
 if not found then raise exception 'SONG_NOT_FOUND'; end if;
 if not private.is_band_leader(b) and not (author=private.actor_id() and private.is_band_member(b)) then raise exception 'FORBIDDEN'; end if;
 if char_length(t) not between 1 and 120 or char_length(a) not between 1 and 120 then raise exception 'INVALID_INPUT'; end if;
 update public.songs set title=t,artist=a,edited_at=now() where id=p_song and band_id=b and (title,artist) is distinct from (t,a);
 return found;
end $$;
revoke all on function public.update_band_song(bigint,text,text) from public,anon,authenticated;
grant execute on function public.update_band_song(bigint,text,text) to authenticated;

-- 밴드장은 언제나 삭제. 올린 사람은 확정 전이고 다른 (현재) 멤버의 투표가 없을 때만 삭제.
create or replace function public.delete_band_song(p_song bigint) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; author uuid; confirmed timestamptz;
begin
 select band_id into b from public.songs where id=p_song;
 if not found then raise exception 'SONG_NOT_FOUND'; end if;
 perform 1 from public.bands where id=b for update;
 if not found then raise exception 'FORBIDDEN'; end if;
 select created_by,confirmed_at into author,confirmed from public.songs where id=p_song and band_id=b for update;
 if not found then raise exception 'SONG_NOT_FOUND'; end if;
 if not private.is_band_leader(b) then
  if author is distinct from private.actor_id() or not private.is_band_member(b) then raise exception 'FORBIDDEN'; end if;
  if confirmed is not null then raise exception 'SONG_CONFIRMED'; end if;
  if exists(select 1 from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active'
            where v.song_id=p_song and v.band_id=b and m.user_id<>author) then raise exception 'SONG_HAS_VOTES'; end if;
 end if;
 delete from public.songs where id=p_song and band_id=b;
 if not found then raise exception 'SONG_NOT_FOUND'; end if;
 -- Foreign keys cascade votes/difficulties; existing song trigger bumps planning_version.
 -- confirmed_plan_songs stores independent title/artist snapshots and is not deleted.
end $$;

-- 곡 화면에 올린 사람·올린 날·수정 시각을 함께 보낸다(나머지는 025와 같음).
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
 'createdBy',s.created_by,'createdByNickname',(select p.nickname from public.profiles p where p.id=s.created_by),'createdAt',s.created_at,'editedAt',s.edited_at,
 'difficulties',case when enabled then coalesce((select jsonb_object_agg(d.part_key,d.difficulty) from public.song_difficulties d where d.song_id=s.id),'{}'::jsonb) else '{}'::jsonb end,
 'difficultyMeta',case when enabled and p_song is not null then coalesce((select jsonb_object_agg(d.part_key,jsonb_build_object('version',d.version,'updatedAt',d.updated_at,'updatedBy',p.nickname)) from public.song_difficulties d left join public.profiles p on p.id=d.updated_by where d.song_id=s.id),'{}'::jsonb) else '{}'::jsonb end,
 'votes',coalesce((select jsonb_agg(jsonb_build_object('memberId',v.member_id,'choice',v.choice,'reason',case when p_song is not null then v.reason else null end)) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.band_id=b and m.status='active' where v.song_id=s.id and v.band_id=b),'[]'::jsonb)
 ) order by s.id) from public.songs s where s.band_id=b and (p_song is null or s.id=p_song)),'[]'::jsonb)) into result from public.bands bands where bands.id=b;
 return result;
end $$;

notify pgrst,'reload schema';
commit;
