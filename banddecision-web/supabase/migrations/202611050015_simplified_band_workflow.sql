-- Remove administrator-PIN workflow; archive by Seoul date; explicit unassigned skill; scoped home summary.
begin;
alter table private.band_login_credentials alter column admin_pin_hash drop not null;
update private.band_login_credentials set admin_pin_hash=null;
update private.member_sessions set admin_until=null;
alter table public.band_members alter column skill drop not null;
alter table public.band_members alter column skill drop default;
-- Existing skill values are preserved: implicit defaults cannot be distinguished from confirmed values.
create or replace function public.create_code_band(p_name text, p_nickname text, p_part text,
  p_password text, p_pin text, p_admin_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); b uuid := gen_random_uuid(); label text := private.trim_part_label(p_part);
begin
  if u is null then return jsonb_build_object('error', 'UNAUTHENTICATED'); end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 0));
  if exists(select 1 from public.band_members where user_id = u and status = 'active')
    or exists(select 1 from private.member_pins where user_id = u)
    or private.actor_id() is not null and private.actor_id() <> u then
    return jsonb_build_object('error', 'ALREADY_SIGNED_IN');
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 40
    or p_nickname is null or char_length(btrim(p_nickname)) not between 1 and 30
    or label is null or char_length(label) not between 1 and 30
    or p_password is null or char_length(p_password) not between 4 and 64 or octet_length(p_password) > 72
    or p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return jsonb_build_object('error', 'INVALID_INPUT');
  end if;
  update public.profiles set nickname = btrim(p_nickname), updated_at = now() where id = u;
  insert into public.bands(id, name, leader_user_id) values(b, btrim(p_name), u);
  insert into public.band_members(band_id, user_id, part_key, part_label, role)
    values(b, u, private.normalize_part_key(label), label, 'leader');
  insert into private.band_login_credentials(band_id, code, password_hash, admin_pin_hash)
    values(b, upper(encode(extensions.gen_random_bytes(5), 'hex')),
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      null);
  insert into private.member_pins(user_id, pin_hash, guest_owned)
    values(u, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
      coalesce((auth.jwt()->>'is_anonymous')::boolean, false));
  insert into private.member_sessions(session_user_id, actor_id, band_id, credential_version, admin_until)
    values(u, u, b, 1, null);
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
  if p_password is null or char_length(p_password) not between 4 and 64 or octet_length(p_password) > 72 then return jsonb_build_object('error', 'INVALID_INPUT'); end if;
  insert into private.band_login_credentials as c(band_id, code, password_hash, admin_pin_hash)
    values(band, upper(encode(extensions.gen_random_bytes(5), 'hex')),
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)), null)
    on conflict(band_id) do update set password_hash = excluded.password_hash,
      admin_pin_hash = excluded.admin_pin_hash, version = c.version + 1 returning version into v;
  -- A password rotation invalidates grants and every other device's band session.
  update private.member_sessions set credential_version = v, admin_until = null
    where session_user_id = auth.uid() and band_id = band;
  return jsonb_build_object('ok', true);
end $$;

create function public.create_code_band(p_name text,p_nickname text,p_part text,p_password text,p_pin text) returns jsonb
language sql security definer set search_path='' as $$ select public.create_code_band(p_name,p_nickname,p_part,p_password,p_pin,null) $$;
create function public.configure_band_login(p_password text) returns jsonb
language sql security definer set search_path='' as $$ select public.configure_band_login(p_password,null) $$;
drop function public.transfer_leadership(uuid,uuid,text);
drop function public.unlock_band_admin(text);
create function public.transfer_leadership(p_band uuid, p_member uuid) returns void
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
  if exists(select 1 from private.band_login_credentials where band_id=p_band)
    and not exists(select 1 from private.member_pins where user_id=v_target.user_id) then raise exception 'TARGET_PIN_REQUIRED'; end if;
  update public.band_members set role = 'member' where band_id = p_band and role = 'leader' and status = 'active';
  update public.band_members set role = 'leader' where id = v_target.id;
  update public.bands set leader_user_id = v_target.user_id, updated_at = now() where id = p_band;
  -- Keep personal sessions, but nobody inherits an old admin elevation after a role change.
  update private.member_sessions set admin_until = null where band_id = p_band;
  delete from private.login_attempts where key = 'admin:' || p_band::text;
end $$;
create or replace function public.update_member_skill(p_member uuid, p_skill smallint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_band uuid;
begin
  select band_id into v_band from public.band_members where id = p_member and status = 'active';
  if not found then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.bands where id = v_band for update;
  if not private.is_band_leader(v_band) then raise exception 'FORBIDDEN'; end if;
  if p_skill is not null and p_skill not between 1 and 5 then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.planning_rounds where band_id = v_band and status in ('collecting', 'ready') for update;
  update public.band_members set skill = p_skill where id = p_member and status = 'active';
  if not found then raise exception 'INVALID_TARGET'; end if;
  update public.planning_rounds set version = version + 1 where band_id = v_band and status in ('collecting', 'ready');
end $$;

create or replace function private.check_plan_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.bands where id=new.band_id for update;
 if new.rehearsal_date>=(now() at time zone 'Asia/Seoul')::date
 and (select count(*) from public.confirmed_plans where band_id=new.band_id and id<>new.id and rehearsal_date>=(now() at time zone 'Asia/Seoul')::date)>=5 then raise exception 'PLAN_LIMIT_REACHED'; end if;
 return new;
end $$;
drop trigger confirmed_plans_capacity on public.confirmed_plans;
create trigger confirmed_plans_capacity before insert or update of band_id,rehearsal_date on public.confirmed_plans for each row execute function private.check_plan_capacity();
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

create function public.band_home_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; m uuid; result jsonb; today date:=(now() at time zone 'Asia/Seoul')::date;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('member_count',(select count(*) from public.band_members where band_id=b and status='active'),
 'pending_votes',(select count(*) from public.songs s where s.band_id=b and not exists(select 1 from public.band_song_votes v where v.song_id=s.id and v.member_id=m)),
 'unset_skills',(select count(*) from public.band_members where band_id=b and status='active' and skill is null),
 'my_skill',(select skill from public.band_members where id=m),
 'upcoming_unavailable',coalesce((select jsonb_agg(d.unavailable_date order by d.unavailable_date) from public.unavailable_dates d where d.band_id=b and d.member_id=m and d.unavailable_date>=today),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.create_code_band(text,text,text,text,text),public.configure_band_login(text),public.transfer_leadership(uuid,uuid),public.band_home_context() from public,anon;
grant execute on function public.create_code_band(text,text,text,text,text),public.configure_band_login(text),public.transfer_leadership(uuid,uuid),public.band_home_context() to authenticated;
-- The six-/two-argument functions are retained only for old fixture/client compatibility; obsolete PIN input is ignored.
notify pgrst,'reload schema';
commit;
