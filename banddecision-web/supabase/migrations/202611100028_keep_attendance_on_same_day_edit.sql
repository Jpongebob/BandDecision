-- 계획 수정에서 날짜를 바꾸지 않으면 참석자 명단을 그대로 둔다.
-- 027까지는 수정할 때마다 그 날의 가능한 날(available_dates)로 참석자를 다시 계산했다.
-- 그래서 027 전에 멤버가 확정일을 뺀 계획은 시간·장소만 고쳐도 참석자가 바뀌었다(예: 5/5 → 2/5).
-- 날짜가 같으면: 참석자 기록과 인원은 그대로, 부분 참석 동의도 요구하지 않는다. 참석은 set_plan_attendance로 바꾼다.
-- 날짜가 바뀌거나 새 계획이면: 지금과 같이 그 날의 가능한 날로 계산하고, 빠지는 멤버가 있으면 동의가 필요하다.
-- 함수 이름·인자·반환형은 그대로라서 지금 배포된 화면도 그대로 동작한다. 기존 행은 고치거나 지우지 않는다.
-- 027이 먼저 적용돼 있어야 한다. create or replace라 다시 실행해도 결과가 같다.
begin;
do $$
begin
 if to_regprocedure('public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time)') is null
    or to_regprocedure('public.set_plan_attendance(uuid,integer,uuid[])') is null then
  raise exception '202611070027_plan_lock_and_song_rules.sql을 먼저 적용하세요';
 end if;
end $$;

create or replace function public.save_rehearsal_plan(p_band uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_plan uuid,p_expected_plan_version integer,p_ack_partial boolean,p_location text,p_memo text,p_starts_at time,p_ends_at time) returns uuid
language plpgsql security definer set search_path='' as $$
declare v bigint; old_plan public.confirmed_plans%rowtype; saved_songs jsonb:='[]'; n int; attend int; song bigint; plan uuid; snapshot jsonb; same_day boolean:=false;
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
  same_day:=p_date is not distinct from old_plan.rehearsal_date;
 elsif (select count(*) from public.confirmed_plans where band_id=p_band and rehearsal_date>=(now() at time zone 'Asia/Seoul')::date)>=5 then raise exception 'PLAN_LIMIT_REACHED'; end if;
 if p_plan is not null and old_plan.rehearsal_date<(now() at time zone 'Asia/Seoul')::date
    and p_date>=(now() at time zone 'Asia/Seoul')::date
    and (select count(*) from public.confirmed_plans where band_id=p_band and rehearsal_date>=(now() at time zone 'Asia/Seoul')::date)>=5 then raise exception 'PLAN_LIMIT_REACHED'; end if;
 if p_date is null or (p_date<(now() at time zone 'Asia/Seoul')::date and (p_plan is null or p_date is distinct from old_plan.rehearsal_date)) then raise exception 'DATE_OUT_OF_RANGE'; end if;
 if p_song_ids is null or cardinality(p_song_ids)<>(select count(distinct x) from unnest(p_song_ids) x) or exists(select 1 from unnest(p_song_ids) x where x is null or x<1) then raise exception 'INVALID_INPUT'; end if;
 select count(*) into n from public.band_members where band_id=p_band and status='active';
 if n=0 then raise exception 'NO_MEMBERS'; end if;
 if not same_day then
  select count(*) into attend from public.band_members m where m.band_id=p_band and m.status='active' and exists(select 1 from public.available_dates d where d.member_id=m.id and d.band_id=p_band and d.available_date=p_date);
  if attend=0 then raise exception 'NO_ATTENDEES'; end if;
  if attend<n and not coalesce(p_ack_partial,false) then raise exception 'PARTIAL_ACK_REQUIRED'; end if;
 end if;
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
 elsif same_day then
  plan:=p_plan;
  update public.confirmed_plans set location=nullif(btrim(p_location),''),memo=nullif(btrim(p_memo),''),starts_at=p_starts_at,ends_at=p_ends_at,confirmed_by=private.actor_id(),confirmed_at=now(),version=version+1 where id=plan;
  delete from public.confirmed_plan_songs where plan_id=plan;
 else
  plan:=p_plan;
  update public.confirmed_plans set location=nullif(btrim(p_location),''),memo=nullif(btrim(p_memo),''),rehearsal_date=p_date,starts_at=p_starts_at,ends_at=p_ends_at,participant_count=n,attendee_count=attend,confirmed_by=private.actor_id(),confirmed_at=now(),version=version+1 where id=plan;
  delete from public.confirmed_plan_members where plan_id=plan;
  delete from public.confirmed_plan_songs where plan_id=plan;
 end if;
 if not same_day then
  insert into public.confirmed_plan_members(plan_id,source_member_id,nickname_snapshot,part_snapshot,attending,reason_snapshot)
  select plan,m.id,p.nickname,m.part_label,exists(select 1 from public.available_dates d where d.member_id=m.id and d.band_id=p_band and d.available_date=p_date),null::text
  from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=p_band and m.status='active';
 end if;
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
comment on function public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time) is '028: 날짜가 같은 수정은 참석자 명단을 유지';
revoke all on function public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time) from public,anon,authenticated;
grant execute on function public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time) to authenticated;
notify pgrst,'reload schema';
commit;
