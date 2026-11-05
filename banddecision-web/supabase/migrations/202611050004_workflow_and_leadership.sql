-- Fix availability writes and serialize leader-authorized workflows with handoff.
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

create or replace function public.start_round(p_band uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_id uuid; v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  perform 1 from public.bands where id = p_band for update;
  if not found or not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
  v_actor := private.actor_id();
  update public.planning_rounds set status = 'closed' where band_id = p_band and status in ('collecting', 'ready');
  if not exists(select 1 from public.band_members where band_id = p_band and status = 'active') then raise exception 'NO_MEMBERS'; end if;
  insert into public.planning_rounds(band_id, start_date, end_date, created_by)
    values(p_band, v_today, v_today + 59, v_actor) returning id into v_id;
  insert into public.round_participants(round_id, member_id, user_id_snapshot, nickname_snapshot, part_key_snapshot, part_label_snapshot)
    select v_id, m.id, m.user_id, p.nickname, m.part_key, m.part_label
    from public.band_members m join public.profiles p on p.id = m.user_id where m.band_id = p_band and m.status = 'active';
  insert into public.round_submissions(round_id, member_id) select v_id, member_id from public.round_participants where round_id = v_id;
  return v_id;
end $$;

create or replace function public.update_member_skill(p_member uuid, p_skill smallint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_band uuid;
begin
  select band_id into v_band from public.band_members where id = p_member and status = 'active';
  if not found then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.bands where id = v_band for update;
  if not private.is_band_leader(v_band) then raise exception 'FORBIDDEN'; end if;
  if p_skill is null or p_skill not between 1 and 5 then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.planning_rounds where band_id = v_band and status in ('collecting', 'ready') for update;
  update public.band_members set skill = p_skill where id = p_member and status = 'active';
  if not found then raise exception 'INVALID_TARGET'; end if;
  update public.planning_rounds set version = version + 1 where band_id = v_band and status in ('collecting', 'ready');
end $$;

create or replace function public.update_member_part(p_member uuid, p_part text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_band uuid; v_label text := private.trim_part_label(p_part);
begin
  select band_id into v_band from public.band_members where id = p_member and status = 'active';
  if not found then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.bands where id = v_band for update;
  if not private.is_band_leader(v_band) then raise exception 'FORBIDDEN'; end if;
  if v_label is null or char_length(v_label) not between 1 and 30 then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.planning_rounds where band_id = v_band and status in ('collecting', 'ready') for update;
  update public.planning_rounds set status = 'invalidated', version = version + 1 where band_id = v_band and status in ('collecting', 'ready');
  update public.band_members set part_label = v_label, part_key = private.normalize_part_key(v_label) where id = p_member and status = 'active';
  if not found then raise exception 'INVALID_TARGET'; end if;
end $$;

create or replace function public.remove_member(p_member uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_band uuid;
begin
  select band_id into v_band from public.band_members where id = p_member and status = 'active';
  if not found then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.bands where id = v_band for update;
  if not private.is_band_leader(v_band) then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.band_members where id = p_member and band_id = v_band and status = 'active' and role = 'member' for update;
  if not found then raise exception 'INVALID_TARGET'; end if;
  perform 1 from public.planning_rounds where band_id = v_band and status in ('collecting', 'ready') for update;
  update public.planning_rounds set status = 'invalidated', version = version + 1
    where band_id = v_band and status in ('collecting', 'ready')
      and exists(select 1 from public.round_participants rp where rp.round_id = planning_rounds.id and rp.member_id = p_member);
  update public.band_members set status = 'left', left_at = now() where id = p_member;
  delete from private.member_sessions where actor_id = (select user_id from public.band_members where id = p_member);
end $$;

create or replace function public.leave_band() returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.actor_id(); v_band uuid; v_member public.band_members%rowtype; v_count integer;
begin
  select band_id into v_band from public.band_members where user_id = v_actor and status = 'active';
  if not found then raise exception 'NOT_MEMBER'; end if;
  perform 1 from public.bands where id = v_band for update;
  select * into v_member from public.band_members where band_id = v_band and user_id = v_actor and status = 'active' for update;
  if not found then raise exception 'NOT_MEMBER'; end if;
  select count(*) into v_count from public.band_members where band_id = v_band and status = 'active';
  if v_member.role = 'leader' then
    if not private.is_band_leader(v_band) then raise exception 'FORBIDDEN'; end if;
    if v_count > 1 then raise exception 'TRANSFER_LEADERSHIP_REQUIRED'; end if;
    delete from public.bands where id = v_band;
    return;
  end if;
  perform 1 from public.planning_rounds where band_id = v_band and status in ('collecting', 'ready') for update;
  update public.planning_rounds set status = 'invalidated', version = version + 1
    where band_id = v_band and status in ('collecting', 'ready')
      and exists(select 1 from public.round_participants rp where rp.round_id = planning_rounds.id and rp.member_id = v_member.id);
  update public.band_members set status = 'left', left_at = now() where id = v_member.id;
  delete from private.member_sessions where actor_id = v_actor;
end $$;

drop function public.transfer_leadership(uuid, uuid);
create function public.transfer_leadership(p_band uuid, p_member uuid, p_admin_pin text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_target public.band_members%rowtype;
  v_credentials private.band_login_credentials%rowtype;
  v_target_pin text;
begin
  -- Serialize handoffs, removals, round creation and final confirmation on the band first.
  perform 1 from public.bands where id = p_band for update;
  if not found or not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
  v_actor := private.actor_id();
  select * into v_target from public.band_members
    where id = p_member and band_id = p_band and status = 'active' and role = 'member' for update;
  if not found or v_target.user_id = v_actor then raise exception 'INVALID_TARGET'; end if;
  select * into v_credentials from private.band_login_credentials where band_id = p_band for update;
  if found then
    if p_admin_pin is null or p_admin_pin !~ '^[0-9]{6}$' then raise exception 'ADMIN_PIN_REQUIRED'; end if;
    perform pg_advisory_xact_lock(hashtextextended('pinchange:' || v_target.user_id::text, 0));
    select pin_hash into v_target_pin from private.member_pins where user_id = v_target.user_id;
    if v_target_pin is null then raise exception 'TARGET_PIN_REQUIRED'; end if;
    if extensions.crypt(p_admin_pin, v_target_pin) = v_target_pin then raise exception 'ADMIN_PIN_SAME_AS_PERSONAL'; end if;
    update private.band_login_credentials set admin_pin_hash = extensions.crypt(p_admin_pin, extensions.gen_salt('bf', 10))
      where band_id = p_band;
  end if;
  update public.band_members set role = 'member' where band_id = p_band and role = 'leader' and status = 'active';
  update public.band_members set role = 'leader' where id = v_target.id;
  update public.bands set leader_user_id = v_target.user_id, updated_at = now() where id = p_band;
  -- Keep personal sessions, but nobody inherits an old admin elevation after a role change.
  update private.member_sessions set admin_until = null where band_id = p_band;
  delete from private.login_attempts where key = 'admin:' || p_band::text;
end $$;
revoke all on function public.transfer_leadership(uuid, uuid, text) from public, anon;
grant execute on function public.transfer_leadership(uuid, uuid, text) to authenticated;

create or replace function public.current_band_identity() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'nickname', p.nickname, 'band_id', m.band_id,
    'admin_unlocked', coalesce(private.is_band_leader(m.band_id), false), 'code_enabled', c.band_id is not null)
  from public.profiles p
  left join public.band_members m on m.user_id = p.id and m.status = 'active'
  left join private.band_login_credentials c on c.band_id = m.band_id
  where p.id = private.actor_id()
$$;

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
 delete from public.confirmed_plans where band_id=r.band_id; insert into public.confirmed_plans(band_id,round_id,rehearsal_date,participant_count,attendee_count,confirmed_by) values(r.band_id,p_round,p_date,n,attend,private.actor_id()) returning id into plan;
 insert into public.confirmed_plan_members(plan_id,source_member_id,nickname_snapshot,part_snapshot,attending,reason_snapshot) select plan,rp.member_id,rp.nickname_snapshot,rp.part_label_snapshot,not exists(select 1 from public.unavailable_dates d where d.band_id=r.band_id and d.member_id=rp.member_id and d.unavailable_date=p_date),(select d.reason from public.unavailable_dates d where d.band_id=r.band_id and d.member_id=rp.member_id and d.unavailable_date=p_date) from public.round_participants rp where rp.round_id=p_round;
 insert into public.confirmed_plan_songs(plan_id,source_song_id,title_snapshot,artist_snapshot,display_order) select plan,s.id,s.title,s.artist,o::int from unnest(p_song_ids) with ordinality x(id,o) join public.songs s on s.id=x.id; return plan; end $$;

create or replace function public.change_member_pin(p_pin text, p_current_pin text default null, p_member uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.actor_id(); target public.band_members%rowtype; h text;
begin
  if actor is null then return jsonb_build_object('error', 'UNAUTHENTICATED'); end if;
  select * into target from public.band_members where status = 'active' and
    ((p_member is null and user_id = actor) or id = p_member);
  if not found then return jsonb_build_object('error', 'FORBIDDEN'); end if;
  perform 1 from public.bands where id = target.band_id for update;
  actor := private.actor_id();
  if actor is null then return jsonb_build_object('error', 'UNAUTHENTICATED'); end if;
  select * into target from public.band_members where id = target.id and status = 'active' for update;
  if not found then return jsonb_build_object('error', 'FORBIDDEN'); end if;
  if target.user_id <> actor and not private.is_band_leader(target.band_id) then
    return jsonb_build_object('error', 'FORBIDDEN');
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then return jsonb_build_object('error', 'INVALID_INPUT'); end if;
  if target.role = 'leader' and exists(select 1 from private.band_login_credentials c where c.band_id = target.band_id and extensions.crypt(p_pin, c.admin_pin_hash) = c.admin_pin_hash) then return jsonb_build_object('error', 'INVALID_INPUT'); end if;
  perform pg_advisory_xact_lock(hashtextextended('pinchange:' || target.user_id::text, 0));
  select pin_hash into h from private.member_pins where user_id = target.user_id;
  if target.user_id = actor and h is not null then
    if not private.allow_login_attempt('pinchange:' || actor::text, 10) then return jsonb_build_object('error', 'RATE_LIMITED'); end if;
    if p_current_pin is null or p_current_pin !~ '^[0-9]{6}$' or extensions.crypt(p_current_pin, h) <> h then
      return jsonb_build_object('error', 'BAD_PIN');
    end if;
  end if;
  insert into private.member_pins(user_id, pin_hash) values(target.user_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
    on conflict(user_id) do update set pin_hash = excluded.pin_hash;
  delete from private.member_sessions where actor_id = target.user_id and session_user_id <> auth.uid();
  delete from private.login_attempts where key in ('pinchange:' || target.user_id::text, 'pin:' || target.id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.configure_band_login(p_password text, p_admin_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare band uuid; v integer;
begin
  select id into band from public.bands where leader_user_id = private.actor_id();
  if band is null then return jsonb_build_object('error', 'FORBIDDEN'); end if;
  perform 1 from public.bands where id = band for update;
  if not private.is_band_leader(band) then return jsonb_build_object('error', 'FORBIDDEN'); end if;
  if p_password is null or char_length(p_password) not between 4 and 64 or octet_length(p_password) > 72
    or p_admin_pin is null or p_admin_pin !~ '^[0-9]{6}$' then return jsonb_build_object('error', 'INVALID_INPUT'); end if;
  if exists(select 1 from private.member_pins p where p.user_id = private.actor_id()
    and extensions.crypt(p_admin_pin, p.pin_hash) = p.pin_hash) then
    return jsonb_build_object('error', 'INVALID_INPUT');
  end if;
  insert into private.band_login_credentials as c(band_id, code, password_hash, admin_pin_hash)
    values(band, upper(encode(extensions.gen_random_bytes(5), 'hex')),
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)), extensions.crypt(p_admin_pin, extensions.gen_salt('bf', 10)))
    on conflict(band_id) do update set password_hash = excluded.password_hash,
      admin_pin_hash = excluded.admin_pin_hash, version = c.version + 1 returning version into v;
  -- A password rotation invalidates grants and every other device's band session.
  update private.member_sessions set credential_version = v, admin_until = now() + interval '30 minutes'
    where session_user_id = auth.uid() and band_id = band;
  return jsonb_build_object('ok', true);
end $$;


do $$
begin
 if exists(select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables) then
   if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bands') then
     alter publication supabase_realtime add table public.bands;
   end if;
   if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'band_members') then
     alter publication supabase_realtime add table public.band_members;
   end if;
 end if;
end $$;

notify pgrst, 'reload schema';
commit;
