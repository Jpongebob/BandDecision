-- Preserve confirmed snapshots; allow at most five plans per band.
begin;
alter table public.confirmed_plans drop constraint confirmed_plans_band_id_key;
create index confirmed_plans_band_date on public.confirmed_plans(band_id, rehearsal_date, confirmed_at);
create function private.check_plan_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.bands where id=new.band_id for update;
  if (select count(*) from public.confirmed_plans where band_id=new.band_id and id<>new.id)>=5 then
    raise exception 'PLAN_LIMIT_REACHED';
  end if;
  return new;
end $$;
revoke all on function private.check_plan_capacity() from public, anon, authenticated;
create trigger confirmed_plans_capacity before insert or update of band_id on public.confirmed_plans
  for each row execute function private.check_plan_capacity();
create or replace function public.confirm_rehearsal_plan(p_round uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_ack_partial boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare authority_band uuid; r public.planning_rounds%rowtype; n int; needed int; attend int; plan uuid; today date:=(now() at time zone 'Asia/Seoul')::date; song bigint;
begin select band_id into authority_band from public.planning_rounds where id=p_round; if not found then raise exception 'ROUND_INVALID'; end if; perform 1 from public.bands where id=authority_band for update; select * into r from public.planning_rounds where id=p_round for update; if not found or r.status not in ('collecting','ready') then raise exception 'ROUND_INVALID'; end if; if not private.is_band_leader(r.band_id) then raise exception 'FORBIDDEN'; end if; if p_expected_version is null or r.version<>p_expected_version then raise exception 'ROUND_STALE'; end if;
 if p_date is null or p_date<greatest(today,r.start_date) or p_date>r.end_date then raise exception 'DATE_OUT_OF_RANGE'; end if; if p_song_ids is null or cardinality(p_song_ids)=0 or cardinality(p_song_ids)<>(select count(distinct x) from unnest(p_song_ids) x) then raise exception 'INVALID_INPUT'; end if;
 select count(*) into n from public.round_participants where round_id=p_round; if n=0 or (select count(*) from public.round_submissions where round_id=p_round)<>n or exists(select 1 from public.round_submissions where round_id=p_round and status='pending') then raise exception 'SUBMISSIONS_PENDING'; end if;
 select count(*) into attend from public.round_participants rp where rp.round_id=p_round and not exists(select 1 from public.unavailable_dates d where d.member_id=rp.member_id and d.band_id=r.band_id and d.unavailable_date=p_date); if attend=0 then raise exception 'NO_ATTENDEES'; end if; if attend<n and not coalesce(p_ack_partial,false) then raise exception 'PARTIAL_ACK_REQUIRED'; end if; needed:=(2*n+2)/3;
 foreach song in array p_song_ids loop
   if not exists(select 1 from public.songs where id=song and band_id=r.band_id) or (select count(*) from public.song_votes where round_id=p_round and song_id=song)<>n or (select count(*) from public.song_votes where round_id=p_round and song_id=song and choice='yes')<needed then raise exception 'SONG_NOT_ELIGIBLE'; end if;
   if exists(select 1 from (select distinct part_key_snapshot k from public.round_participants where round_id=p_round) p where not exists(select 1 from public.song_difficulties d where d.song_id=song and d.part_key=p.k)) then raise exception 'SONG_NOT_ELIGIBLE'; end if;
 end loop;
 if (select count(*) from public.confirmed_plans where band_id=r.band_id)>=5 then raise exception 'PLAN_LIMIT_REACHED'; end if; insert into public.confirmed_plans(band_id,round_id,rehearsal_date,participant_count,attendee_count,confirmed_by) values(r.band_id,p_round,p_date,n,attend,private.actor_id()) returning id into plan;
 insert into public.confirmed_plan_members(plan_id,source_member_id,nickname_snapshot,part_snapshot,attending,reason_snapshot) select plan,rp.member_id,rp.nickname_snapshot,rp.part_label_snapshot,not exists(select 1 from public.unavailable_dates d where d.band_id=r.band_id and d.member_id=rp.member_id and d.unavailable_date=p_date),(select d.reason from public.unavailable_dates d where d.band_id=r.band_id and d.member_id=rp.member_id and d.unavailable_date=p_date) from public.round_participants rp where rp.round_id=p_round;
 insert into public.confirmed_plan_songs(plan_id,source_song_id,title_snapshot,artist_snapshot,display_order) select plan,s.id,s.title,s.artist,o::int from unnest(p_song_ids) with ordinality x(id,o) join public.songs s on s.id=x.id; update public.planning_rounds set version=version+1 where id=p_round; return plan; end $$;


create function public.delete_rehearsal_plan(p_plan uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_band uuid;
begin
  select band_id into v_band from public.confirmed_plans where id=p_plan;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  perform 1 from public.bands where id=v_band for update;
  if not private.is_band_leader(v_band) then raise exception 'FORBIDDEN'; end if;
  delete from public.confirmed_plans where id=p_plan and band_id=v_band;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  update public.planning_rounds set version=version+1
    where band_id=v_band and status in ('collecting','ready');
end $$;
revoke all on function public.delete_rehearsal_plan(uuid) from public, anon;
grant execute on function public.delete_rehearsal_plan(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
