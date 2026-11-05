-- Reject malformed RPC inputs before any existing dates/votes are changed.
begin;
create or replace function public.save_unavailability(p_round uuid, p_dates jsonb, p_ack_outside boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.actor_id();
  v_round public.planning_rounds%rowtype;
  v_member uuid;
  v_entry jsonb;
  v_date date;
  v_reason text;
  v_inside integer;
begin
  if v_actor is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_round from public.planning_rounds where id = p_round for update;
  if not found or v_round.status not in ('collecting', 'ready') then raise exception 'ROUND_INVALID'; end if;
  select member_id into v_member from public.round_participants
    where round_id = p_round and user_id_snapshot = v_actor;
  if v_member is null or not private.is_band_member(v_round.band_id) then raise exception 'FORBIDDEN'; end if;
  if p_dates is null or jsonb_typeof(p_dates) <> 'array' then raise exception 'INVALID_INPUT'; end if;
  if jsonb_array_length(p_dates) > 366 then raise exception 'INVALID_INPUT'; end if;
  for v_entry in select value from jsonb_array_elements(p_dates) loop
    if jsonb_typeof(v_entry) <> 'object' or coalesce(v_entry->>'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'INVALID_INPUT'; end if;
    if coalesce(jsonb_typeof(v_entry->'reason'), 'null') <> 'string' then raise exception 'INVALID_INPUT'; end if;
    begin v_date := (v_entry->>'date')::date;
    exception when others then raise exception 'INVALID_INPUT'; end;
    v_reason := btrim(coalesce(v_entry->>'reason', ''));
    if v_date < (now() at time zone 'Asia/Seoul')::date or char_length(v_reason) not between 1 and 200 then raise exception 'INVALID_INPUT'; end if;
  end loop;
  if not coalesce(p_ack_outside, false) and exists (
    select 1 from jsonb_array_elements(p_dates) as item(value)
    where (item.value->>'date')::date not between v_round.start_date and v_round.end_date
  ) then raise exception 'OUTSIDE_ACK_REQUIRED'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_dates) as item(value)
    group by item.value->>'date' having count(distinct btrim(item.value->>'reason')) > 1
  ) then raise exception 'DUPLICATE_CONFLICT'; end if;
  delete from public.unavailable_dates
    where member_id = v_member and band_id = v_round.band_id
      and unavailable_date between v_round.start_date and v_round.end_date;
  insert into public.unavailable_dates(band_id, member_id, unavailable_date, reason)
    select distinct on ((item.value->>'date')::date)
      v_round.band_id, v_member, (item.value->>'date')::date, btrim(item.value->>'reason')
    from jsonb_array_elements(p_dates) as item(value)
    on conflict(band_id, member_id, unavailable_date)
      do update set reason = excluded.reason, updated_at = now();
  select count(*) into v_inside from jsonb_array_elements(p_dates) as item(value)
    where (item.value->>'date')::date between v_round.start_date and v_round.end_date;
  update public.round_submissions
    set status = case when v_inside = 0 then 'none' else 'submitted' end, submitted_at = now()
    where round_id = p_round and member_id = v_member;
  if not found then raise exception 'ROUND_INVALID'; end if;
  update public.planning_rounds set version = version + 1 where id = p_round returning version into v_round.version;
  return jsonb_build_object('status', case when v_inside = 0 then 'none' else 'submitted' end, 'version', v_round.version);
end $$;


create or replace function public.cast_vote(p_round uuid,p_song bigint,p_choice text,p_reason text default null) returns bigint language plpgsql security definer set search_path='' as $$
declare r public.planning_rounds%rowtype; m uuid; b uuid;
begin select * into r from public.planning_rounds where id=p_round for update; if not found or r.status not in ('collecting','ready') then raise exception 'ROUND_INVALID'; end if;
 select member_id into m from public.round_participants where round_id=p_round and user_id_snapshot=private.actor_id(); select band_id into b from public.songs where id=p_song;
 if m is null or b is distinct from r.band_id then raise exception 'FORBIDDEN'; end if; if p_choice is null or p_choice not in ('yes','no') or (p_choice='no' and char_length(btrim(coalesce(p_reason,''))) not between 1 and 300) then raise exception 'INVALID_INPUT'; end if;
 insert into public.song_votes(round_id,song_id,member_id,choice,reason) values(p_round,p_song,m,p_choice,case when p_choice='no' then btrim(p_reason) else null end) on conflict(round_id,song_id,member_id) do update set choice=excluded.choice,reason=excluded.reason,updated_at=now();
 update public.planning_rounds set version=version+1 where id=p_round returning version into r.version; return r.version; end $$;

notify pgrst, 'reload schema';
commit;
