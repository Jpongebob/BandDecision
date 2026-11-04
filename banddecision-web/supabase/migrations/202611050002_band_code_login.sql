-- Band code/password -> member PIN. Keep existing email identities and historical IDs.
begin;

create table private.band_login_credentials (
  band_id uuid primary key references public.bands(id) on delete cascade,
  code text not null unique check (code ~ '^[A-F0-9]{10}$'),
  password_hash text not null,
  admin_pin_hash text not null,
  version integer not null default 1
);
create table private.member_pins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  guest_owned boolean not null default false
);
create table private.band_access_grants (
  session_user_id uuid primary key references auth.users(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  credential_version integer not null,
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create table private.member_sessions (
  session_user_id uuid primary key references auth.users(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  credential_version integer not null,
  expires_at timestamptz not null default now() + interval '30 days',
  admin_until timestamptz
);
create index member_sessions_actor on private.member_sessions(actor_id);
create table private.login_attempts (
  key text primary key,
  started_at timestamptz not null default now(),
  attempts integer not null default 1
);
revoke all on all tables in schema private from public, anon, authenticated;

-- Fail closed: an anonymous Auth session has no actor until a PIN-checked mapping exists.
create or replace function private.actor_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select case
    when coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
      or exists(select 1 from private.member_pins p where p.user_id = auth.uid() and p.guest_owned)
    then (
      select s.actor_id from private.member_sessions s
      join private.band_login_credentials c on c.band_id = s.band_id and c.version = s.credential_version
      join public.band_members m on m.user_id = s.actor_id and m.band_id = s.band_id and m.status = 'active'
      where s.session_user_id = auth.uid() and s.expires_at > now()
    )
    else auth.uid()
  end
$$;
revoke all on function private.actor_id() from public, anon;
grant execute on function private.actor_id() to authenticated;

-- Anonymous sign-up has no email. Never require one when the profile trigger runs.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, nickname)
    values(new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'nickname'), ''),
      nullif(split_part(new.email, '@', 1), ''), '새 멤버'), 30))
    on conflict(id) do nothing;
  return new;
end $$;

-- Count failures without raising: an exception would roll back the counter.
create function private.allow_login_attempt(p_key text, p_limit integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  insert into private.login_attempts as a(key) values(p_key)
  on conflict(key) do update set
    attempts = case when a.started_at < now() - interval '15 minutes' then 1 else a.attempts + 1 end,
    started_at = case when a.started_at < now() - interval '15 minutes' then now() else a.started_at end
  returning attempts into total;
  return total <= p_limit;
end $$;

create function private.has_admin_access(p_band uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (
    not coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
    and not exists(select 1 from private.member_pins p where p.user_id = auth.uid() and p.guest_owned)
  ) or exists (
    select 1 from private.member_sessions s
    join private.band_login_credentials c on c.band_id = s.band_id and c.version = s.credential_version
    where s.session_user_id = auth.uid() and s.band_id = p_band
      and s.expires_at > now() and s.admin_until > now()
  )
$$;

-- Existing RLS and RPC definitions are restated below with the canonical actor resolver.
create or replace function private.is_band_member(p_band uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.band_members m where m.band_id=p_band and m.user_id=(select private.actor_id()) and m.status='active') $$;
create or replace function private.can_read_profile(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$ select p_user=(select private.actor_id()) or exists(select 1 from public.band_members a join public.band_members b on b.band_id=a.band_id and b.status='active' where a.user_id=(select private.actor_id()) and a.status='active' and b.user_id=p_user) $$;
create or replace function private.can_read_round(p_round uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.planning_rounds r join public.band_members m on m.band_id=r.band_id where r.id=p_round and m.user_id=(select private.actor_id()) and m.status='active') $$;
create or replace function public.create_band(p_name text,p_part text,p_nickname text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.actor_id(); b uuid; label text:=private.trim_part_label(p_part);
begin
  if u is null then raise exception 'UNAUTHENTICATED'; end if;
  if char_length(btrim(p_name)) not between 2 and 40 or char_length(label) not between 1 and 30 or char_length(btrim(p_nickname)) not between 1 and 30 then raise exception 'INVALID_INPUT'; end if;
  if exists(select 1 from public.band_members where user_id=u and status='active') then raise exception 'ALREADY_IN_BAND'; end if;
  insert into public.profiles(id,nickname) values(u,btrim(p_nickname)) on conflict(id) do update set nickname=excluded.nickname,updated_at=now();
  b:=gen_random_uuid(); insert into public.bands(id,name,leader_user_id) values(b,btrim(p_name),u);
  insert into public.band_members(band_id,user_id,part_key,part_label,role) values(b,u,private.normalize_part_key(label),label,'leader'); return b;
end $$;
create or replace function public.create_invite(p_band uuid) returns table(token text,expires_at timestamptz) language plpgsql security definer set search_path='' as $$
declare raw text:=encode(extensions.gen_random_bytes(32),'hex');
begin if private.actor_id() is null then raise exception 'UNAUTHENTICATED'; end if; if not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
  insert into public.band_invites(band_id,token_hash,created_by,expires_at) values(p_band,extensions.digest(raw,'sha256'),private.actor_id(),now()+interval '7 days') returning band_invites.expires_at into expires_at; token:=raw; return next; end $$;
create or replace function public.redeem_invite(p_token text,p_part text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.actor_id(); i public.band_invites%rowtype; label text:=private.trim_part_label(p_part);
begin if u is null then raise exception 'UNAUTHENTICATED'; end if; if char_length(label) not between 1 and 30 then raise exception 'INVALID_INPUT'; end if;
 if exists(select 1 from public.band_members where user_id=u and status='active') then raise exception 'ALREADY_IN_BAND'; end if;
 select * into i from public.band_invites where token_hash=extensions.digest(p_token,'sha256') for update;
 if not found then raise exception 'INVITE_INVALID'; end if; if i.used_at is not null then raise exception 'INVITE_USED'; end if; if i.cancelled_at is not null or i.expires_at<=now() then raise exception 'INVITE_EXPIRED'; end if;
 insert into public.band_members(band_id,user_id,part_key,part_label) values(i.band_id,u,private.normalize_part_key(label),label); update public.band_invites set used_at=now(),used_by=u where id=i.id; return i.band_id; end $$;
create or replace function public.start_round(p_band uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.actor_id(); r uuid; d date:=(now() at time zone 'Asia/Seoul')::date;
begin if not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if; perform 1 from public.bands where id=p_band for update;
 update public.planning_rounds set status='closed' where band_id=p_band and status in ('collecting','ready');
 if not exists(select 1 from public.band_members where band_id=p_band and status='active') then raise exception 'NO_MEMBERS'; end if;
 insert into public.planning_rounds(band_id,start_date,end_date,created_by) values(p_band,d,d+59,u) returning id into r;
 insert into public.round_participants(round_id,member_id,user_id_snapshot,nickname_snapshot,part_key_snapshot,part_label_snapshot) select r,m.id,m.user_id,p.nickname,m.part_key,m.part_label from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=p_band and m.status='active';
 insert into public.round_submissions(round_id,member_id) select r,member_id from public.round_participants where round_id=r; return r; end $$;
create or replace function public.save_unavailability(p_round uuid,p_dates jsonb,p_ack_outside boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.actor_id(); r public.planning_rounds%rowtype; m uuid; x jsonb; dt date; why text; n_inside int;
begin select * into r from public.planning_rounds where id=p_round for update; if not found or r.status not in ('collecting','ready') then raise exception 'ROUND_INVALID'; end if;
 select member_id into m from public.round_participants where round_id=p_round and user_id_snapshot=u; if m is null then raise exception 'FORBIDDEN'; end if;
 if p_dates is null or jsonb_typeof(p_dates)<>'array' or jsonb_array_length(p_dates)>366 then raise exception 'INVALID_INPUT'; end if;
 for x in select value from jsonb_array_elements(p_dates) loop if coalesce(x->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'INVALID_INPUT'; end if; begin dt:=(x->>'date')::date; exception when others then raise exception 'INVALID_INPUT'; end; why:=btrim(coalesce(x->>'reason','')); if dt<(now() at time zone 'Asia/Seoul')::date or char_length(why) not between 1 and 200 then raise exception 'INVALID_INPUT'; end if; end loop;
 if not coalesce(p_ack_outside,false) and exists(select 1 from jsonb_array_elements(p_dates) x where (x->>'date')::date not between r.start_date and r.end_date) then raise exception 'OUTSIDE_ACK_REQUIRED'; end if;
 if exists(select 1 from jsonb_array_elements(p_dates) with ordinality a(v,ord) join jsonb_array_elements(p_dates) with ordinality b(v,ord) on a.ord<b.ord where a.v->>'date'=b.v->>'date' and a.v->>'reason'<>b.v->>'reason') then raise exception 'DUPLICATE_CONFLICT'; end if;
 delete from public.unavailable_dates where member_id=m and band_id=r.band_id and unavailable_date between r.start_date and r.end_date;
 insert into public.unavailable_dates(band_id,member_id,unavailable_date,reason) select r.band_id,m,(x->>'date')::date,btrim(x->>'reason') from jsonb_array_elements(p_dates) x on conflict(band_id,member_id,unavailable_date) do update set reason=excluded.reason,updated_at=now();
 select count(*) into n_inside from jsonb_array_elements(p_dates) x where (x->>'date')::date between r.start_date and r.end_date;
 update public.round_submissions set status=case when n_inside=0 then 'none' else 'submitted' end,submitted_at=now() where round_id=p_round and member_id=m;
 update public.planning_rounds set version=version+1 where id=p_round returning version into r.version;
 return jsonb_build_object('status',case when n_inside=0 then 'none' else 'submitted' end,'version',r.version); end $$;
create or replace function public.cast_vote(p_round uuid,p_song bigint,p_choice text,p_reason text default null) returns bigint language plpgsql security definer set search_path='' as $$
declare r public.planning_rounds%rowtype; m uuid; b uuid;
begin select * into r from public.planning_rounds where id=p_round for update; if not found or r.status not in ('collecting','ready') then raise exception 'ROUND_INVALID'; end if;
 select member_id into m from public.round_participants where round_id=p_round and user_id_snapshot=private.actor_id(); select band_id into b from public.songs where id=p_song;
 if m is null or b is distinct from r.band_id then raise exception 'FORBIDDEN'; end if; if p_choice not in ('yes','no') or (p_choice='no' and char_length(btrim(coalesce(p_reason,''))) not between 1 and 300) then raise exception 'INVALID_INPUT'; end if;
 insert into public.song_votes(round_id,song_id,member_id,choice,reason) values(p_round,p_song,m,p_choice,case when p_choice='no' then btrim(p_reason) else null end) on conflict(round_id,song_id,member_id) do update set choice=excluded.choice,reason=excluded.reason,updated_at=now();
 update public.planning_rounds set version=version+1 where id=p_round returning version into r.version; return r.version; end $$;
create or replace function public.leave_band() returns void language plpgsql security definer set search_path='' as $$ declare m public.band_members%rowtype; n int; begin select * into m from public.band_members where user_id=private.actor_id() and status='active' for update; if not found then raise exception 'NOT_MEMBER'; end if; select count(*) into n from public.band_members where band_id=m.band_id and status='active'; if m.role='leader' and not private.is_band_leader(m.band_id) then raise exception 'FORBIDDEN'; end if; if m.role='leader' and n>1 then raise exception 'TRANSFER_LEADERSHIP_REQUIRED'; end if; if m.role='leader' then delete from public.bands where id=m.band_id; return; end if; perform 1 from public.planning_rounds where band_id=m.band_id and status in ('collecting','ready') for update; update public.planning_rounds set status='invalidated',version=version+1 where band_id=m.band_id and status in ('collecting','ready') and exists(select 1 from public.round_participants rp where rp.round_id=planning_rounds.id and rp.member_id=m.id); update public.band_members set status='left',left_at=now() where id=m.id; end $$;
create or replace function public.confirm_rehearsal_plan(p_round uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_ack_partial boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.planning_rounds%rowtype; n int; needed int; attend int; plan uuid; today date:=(now() at time zone 'Asia/Seoul')::date; song bigint;
begin select * into r from public.planning_rounds where id=p_round for update; if not found or r.status not in ('collecting','ready') then raise exception 'ROUND_INVALID'; end if; if not private.is_band_leader(r.band_id) then raise exception 'FORBIDDEN'; end if; if p_expected_version is null or r.version<>p_expected_version then raise exception 'ROUND_STALE'; end if;
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
create or replace function public.request_account_deletion() returns uuid language plpgsql security definer set search_path='' as $$ declare id uuid; begin if private.actor_id() is null then raise exception 'UNAUTHENTICATED'; end if; if exists(select 1 from public.bands b where b.leader_user_id=private.actor_id() and (select count(*) from public.band_members m where m.band_id=b.id and m.status='active')>1) then raise exception 'TRANSFER_LEADERSHIP_REQUIRED'; end if; insert into public.account_deletion_requests(user_id) values(private.actor_id()) on conflict(user_id) do update set requested_at=now(),status='pending' returning account_deletion_requests.id into id; return id; end $$;
create or replace function public.update_my_nickname(p_nickname text) returns void language plpgsql security definer set search_path='' as $$ begin if private.actor_id() is null then raise exception 'UNAUTHENTICATED'; end if; if char_length(btrim(p_nickname)) not between 1 and 30 then raise exception 'INVALID_INPUT'; end if; update public.profiles set nickname=btrim(p_nickname),updated_at=now() where id=private.actor_id(); end $$;
drop policy if exists profile_self_update on public.profiles;
create policy profile_self_update on public.profiles for update to authenticated using(id=(select private.actor_id())) with check(id=(select private.actor_id()));
drop policy if exists deletion_self_read on public.account_deletion_requests;
create policy deletion_self_read on public.account_deletion_requests for select to authenticated using(user_id=(select private.actor_id()));
create or replace function public.add_song(p_band uuid, p_title text, p_artist text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.actor_id();
  song_id bigint;
begin
  if actor is null then raise exception 'UNAUTHENTICATED'; end if;
  if not private.is_band_member(p_band) then raise exception 'FORBIDDEN'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 120
     or char_length(btrim(coalesce(p_artist, ''))) not between 1 and 120 then
    raise exception 'INVALID_INPUT';
  end if;
  perform 1 from public.planning_rounds
    where band_id = p_band and status in ('collecting', 'ready') for update;
  insert into public.songs(band_id, title, artist, created_by)
    values (p_band, btrim(p_title), btrim(p_artist), actor)
    returning id into song_id;
  update public.planning_rounds set version = version + 1
    where band_id = p_band and status in ('collecting', 'ready');
  return song_id;
end;
$$;
create or replace function public.update_song_difficulty(
  p_song bigint,
  p_part text,
  p_difficulty smallint,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.actor_id();
  band uuid;
  current_version integer;
  saved_version integer;
begin
  if actor is null then raise exception 'UNAUTHENTICATED'; end if;
  select s.band_id into band from public.songs s where s.id = p_song for update;
  if not found then raise exception 'SONG_NOT_FOUND'; end if;
  if not private.is_band_member(band) then raise exception 'FORBIDDEN'; end if;
  if char_length(btrim(coalesce(p_part, ''))) not between 1 and 30
     or p_difficulty is null
     or p_difficulty not between 1 and 5
     or p_expected_version is null or p_expected_version < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_song::text || ':' || lower(btrim(p_part)), 0));
  select d.version into current_version
    from public.song_difficulties d
    where d.song_id = p_song and d.part_key = lower(btrim(p_part))
    for update;

  if not found then
    if p_expected_version <> 0 then raise exception 'DIFFICULTY_STALE'; end if;
    insert into public.song_difficulties(song_id, part_key, difficulty, version, updated_by, updated_at)
      values (p_song, lower(btrim(p_part)), p_difficulty, 1, actor, now())
      returning version into saved_version;
  else
    if p_expected_version <> current_version then raise exception 'DIFFICULTY_STALE'; end if;
    update public.song_difficulties
      set difficulty = p_difficulty,
          version = version + 1,
          updated_by = actor,
          updated_at = now()
      where song_id = p_song and part_key = lower(btrim(p_part))
      returning version into saved_version;
  end if;

  perform 1 from public.planning_rounds
    where band_id = band and status in ('collecting', 'ready') for update;
  update public.planning_rounds set version = version + 1
    where band_id = band and status in ('collecting', 'ready');
  return saved_version;
end;
$$;
drop policy if exists songs_member_insert on public.songs;
create policy songs_member_insert on public.songs
  for insert to authenticated
  with check (created_by = (select private.actor_id()) and private.is_band_member(band_id));
drop policy if exists difficulties_member_insert on public.song_difficulties;
create policy difficulties_member_insert on public.song_difficulties
  for insert to authenticated
  with check (exists (
    select 1 from public.songs s
    where s.id = song_id and private.is_band_member(s.band_id)
  ) and updated_by = (select private.actor_id()));
drop policy if exists difficulties_member_update on public.song_difficulties;
create policy difficulties_member_update on public.song_difficulties
  for update to authenticated
  using (exists (
    select 1 from public.songs s
    where s.id = song_id and private.is_band_member(s.band_id)
  ))
  with check (exists (
    select 1 from public.songs s
    where s.id = song_id and private.is_band_member(s.band_id)
  ) and updated_by = (select private.actor_id()));

create or replace function private.is_band_leader(p_band uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.bands b join public.band_members m on m.band_id = b.id
    and m.user_id = b.leader_user_id and m.status = 'active' and m.role = 'leader'
    where b.id = p_band and b.leader_user_id = private.actor_id())
    and private.has_admin_access(p_band)
$$;

create function public.current_band_identity() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'nickname', p.nickname, 'band_id', m.band_id,
    'admin_unlocked', coalesce(private.is_band_leader(m.band_id), false))
  from public.profiles p
  left join public.band_members m on m.user_id = p.id and m.status = 'active'
  where p.id = private.actor_id()
$$;

create function public.begin_band_access(p_code text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c private.band_login_credentials%rowtype; u uuid := auth.uid(); v_code text := upper(btrim(p_code));
begin
  if u is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    return jsonb_build_object('error', 'GUEST_SESSION_REQUIRED');
  end if;
  if private.actor_id() is not null then return jsonb_build_object('error', 'ALREADY_SIGNED_IN'); end if;
  delete from private.band_access_grants where session_user_id = u;
  if not private.allow_login_attempt('session:' || u::text, 30)
    or not private.allow_login_attempt('band:' || left(coalesce(v_code, ''), 10), 100) then
    return jsonb_build_object('error', 'RATE_LIMITED');
  end if;
  if v_code is null or v_code !~ '^[A-F0-9]{10}$' or p_password is null
    or char_length(p_password) not between 8 and 64 or octet_length(p_password) > 72 then
    return jsonb_build_object('error', 'BAD_BAND_CREDENTIALS');
  end if;
  select * into c from private.band_login_credentials where band_login_credentials.code = v_code;
  if not found then return jsonb_build_object('error', 'BAD_BAND_CREDENTIALS'); end if;
  if extensions.crypt(p_password, c.password_hash) <> c.password_hash then
    return jsonb_build_object('error', 'BAD_BAND_CREDENTIALS');
  end if;
  insert into private.band_access_grants(session_user_id, band_id, credential_version)
    values(u, c.band_id, c.version);
  return jsonb_build_object('ok', true);
end $$;

create function public.band_access_context() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('band_name', b.name, 'profiles', coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'nickname', p.nickname,
      'part', m.part_label, 'role', m.role, 'pin_ready', pin.user_id is not null) order by m.joined_at)
    from public.band_members m join public.profiles p on p.id = m.user_id
    left join private.member_pins pin on pin.user_id = m.user_id
    where m.band_id = b.id and m.status = 'active'
  ), '[]'::jsonb))
  from private.band_access_grants a
  join private.band_login_credentials c on c.band_id = a.band_id and c.version = a.credential_version
  join public.bands b on b.id = a.band_id
  where a.session_user_id = auth.uid() and a.expires_at > now()
$$;

create function public.member_pin_login(p_member uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a private.band_access_grants%rowtype; m public.band_members%rowtype; h text; u uuid := auth.uid();
begin
  if u is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    return jsonb_build_object('error', 'GUEST_SESSION_REQUIRED');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 0));
  if private.actor_id() is not null then return jsonb_build_object('error', 'ALREADY_SIGNED_IN'); end if;
  select g.* into a from private.band_access_grants g
    join private.band_login_credentials c on c.band_id = g.band_id and c.version = g.credential_version
    where g.session_user_id = u and g.expires_at > now() for update of g;
  if not found then return jsonb_build_object('error', 'BAND_ACCESS_EXPIRED'); end if;
  if not private.allow_login_attempt('pin:' || coalesce(p_member::text, 'missing'), 10) then
    return jsonb_build_object('error', 'RATE_LIMITED');
  end if;
  select * into m from public.band_members where id = p_member and band_id = a.band_id and status = 'active';
  if not found then return jsonb_build_object('error', 'BAD_PIN'); end if;
  perform pg_advisory_xact_lock(hashtextextended('pinchange:' || m.user_id::text, 0));
  select pin_hash into h from private.member_pins where user_id = m.user_id;
  if h is null or p_pin is null or p_pin !~ '^[0-9]{6}$' or extensions.crypt(p_pin, h) <> h then
    return jsonb_build_object('error', 'BAD_PIN');
  end if;
  insert into private.member_sessions(session_user_id, actor_id, band_id, credential_version)
    values(u, m.user_id, a.band_id, a.credential_version)
    on conflict(session_user_id) do update set actor_id = excluded.actor_id,
      band_id = excluded.band_id, credential_version = excluded.credential_version,
      expires_at = now() + interval '30 days', admin_until = null;
  delete from private.band_access_grants where session_user_id = u;
  delete from private.login_attempts where key = 'pin:' || p_member::text;
  return jsonb_build_object('ok', true);
end $$;

create function public.register_band_profile(p_nickname text, p_part text, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a private.band_access_grants%rowtype; u uuid := auth.uid(); label text := private.trim_part_label(p_part);
begin
  if u is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    return jsonb_build_object('error', 'GUEST_SESSION_REQUIRED');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 0));
  if private.actor_id() is not null then return jsonb_build_object('error', 'ALREADY_SIGNED_IN'); end if;
  if p_nickname is null or char_length(btrim(p_nickname)) not between 1 and 30
    or label is null or char_length(label) not between 1 and 30
    or p_pin is null or p_pin !~ '^[0-9]{6}$' then return jsonb_build_object('error', 'INVALID_INPUT'); end if;
  select g.* into a from private.band_access_grants g
    join private.band_login_credentials c on c.band_id = g.band_id and c.version = g.credential_version
    where g.session_user_id = u and g.expires_at > now() for update of g;
  if not found then return jsonb_build_object('error', 'BAND_ACCESS_EXPIRED'); end if;
  if exists(select 1 from public.band_members where user_id = u and status = 'active')
    or exists(select 1 from private.member_pins where user_id = u) then
    return jsonb_build_object('error', 'ALREADY_SIGNED_IN');
  end if;
  perform 1 from public.bands where id = a.band_id for update;
  if exists(select 1 from public.band_members m join public.profiles p on p.id = m.user_id
    where m.band_id = a.band_id and m.status = 'active' and lower(p.nickname) = lower(btrim(p_nickname))) then
    return jsonb_build_object('error', 'DUPLICATE_NICKNAME');
  end if;
  update public.profiles set nickname = btrim(p_nickname), updated_at = now() where id = u;
  insert into private.member_pins(user_id, pin_hash, guest_owned)
    values(u, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), true);
  insert into public.band_members(band_id, user_id, part_key, part_label)
    values(a.band_id, u, private.normalize_part_key(label), label);
  insert into private.member_sessions(session_user_id, actor_id, band_id, credential_version)
    values(u, u, a.band_id, a.credential_version);
  delete from private.band_access_grants where session_user_id = u;
  return jsonb_build_object('ok', true);
end $$;

create function public.create_code_band(p_name text, p_nickname text, p_part text,
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
    or p_password is null or char_length(p_password) not between 8 and 64 or octet_length(p_password) > 72
    or p_pin is null or p_pin !~ '^[0-9]{6}$'
    or p_admin_pin is null or p_admin_pin !~ '^[0-9]{6}$' or p_pin = p_admin_pin then
    return jsonb_build_object('error', 'INVALID_INPUT');
  end if;
  update public.profiles set nickname = btrim(p_nickname), updated_at = now() where id = u;
  insert into public.bands(id, name, leader_user_id) values(b, btrim(p_name), u);
  insert into public.band_members(band_id, user_id, part_key, part_label, role)
    values(b, u, private.normalize_part_key(label), label, 'leader');
  insert into private.band_login_credentials(band_id, code, password_hash, admin_pin_hash)
    values(b, upper(encode(extensions.gen_random_bytes(5), 'hex')),
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      extensions.crypt(p_admin_pin, extensions.gen_salt('bf', 10)));
  insert into private.member_pins(user_id, pin_hash, guest_owned)
    values(u, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
      coalesce((auth.jwt()->>'is_anonymous')::boolean, false));
  insert into private.member_sessions(session_user_id, actor_id, band_id, credential_version, admin_until)
    values(u, u, b, 1, now() + interval '30 minutes');
  return jsonb_build_object('ok', true);
end $$;

create function public.unlock_band_admin(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c private.band_login_credentials%rowtype; actor uuid := private.actor_id();
begin
  select x.* into c from private.band_login_credentials x join public.bands b on b.id = x.band_id
    where b.leader_user_id = actor;
  if not found then return jsonb_build_object('error', 'FORBIDDEN'); end if;
  if not private.allow_login_attempt('admin:' || c.band_id::text, 10) then
    return jsonb_build_object('error', 'RATE_LIMITED');
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' or extensions.crypt(p_pin, c.admin_pin_hash) <> c.admin_pin_hash then
    return jsonb_build_object('error', 'BAD_PIN');
  end if;
  update private.member_sessions set admin_until = now() + interval '30 minutes'
    where session_user_id = auth.uid() and band_id = c.band_id;
  delete from private.login_attempts where key = 'admin:' || c.band_id::text;
  return jsonb_build_object('ok', true);
end $$;

create function public.band_login_settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('code', c.code, 'role', m.role, 'pin_ready', pin.user_id is not null,
    'admin_unlocked', private.is_band_leader(m.band_id))
  from public.band_members m
  left join private.band_login_credentials c on c.band_id = m.band_id
  left join private.member_pins pin on pin.user_id = m.user_id
  where m.user_id = private.actor_id() and m.status = 'active'
$$;

create function public.configure_band_login(p_password text, p_admin_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare band uuid; v integer;
begin
  select id into band from public.bands where leader_user_id = private.actor_id();
  if band is null or not private.is_band_leader(band) then return jsonb_build_object('error', 'FORBIDDEN'); end if;
  if p_password is null or char_length(p_password) not between 8 and 64 or octet_length(p_password) > 72
    or p_admin_pin is null or p_admin_pin !~ '^[0-9]{6}$' then return jsonb_build_object('error', 'INVALID_INPUT'); end if;
  if exists(select 1 from private.member_pins p where p.user_id = private.actor_id()
    and extensions.crypt(p_admin_pin, p.pin_hash) = p.pin_hash) then
    return jsonb_build_object('error', 'INVALID_INPUT');
  end if;
  perform 1 from public.bands where id = band for update;
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

create function public.change_member_pin(p_pin text, p_current_pin text default null, p_member uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.actor_id(); target public.band_members%rowtype; h text;
begin
  if actor is null then return jsonb_build_object('error', 'UNAUTHENTICATED'); end if;
  select * into target from public.band_members where status = 'active' and
    ((p_member is null and user_id = actor) or id = p_member);
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

create function public.end_band_session() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.member_sessions where session_user_id = auth.uid();
  delete from private.band_access_grants where session_user_id = auth.uid();
end $$;

revoke all on function private.allow_login_attempt(text, integer), private.has_admin_access(uuid) from public, anon, authenticated;
revoke all on function public.current_band_identity(), public.begin_band_access(text, text),
  public.band_access_context(), public.member_pin_login(uuid, text),
  public.register_band_profile(text, text, text), public.create_code_band(text, text, text, text, text, text),
  public.unlock_band_admin(text), public.band_login_settings(), public.configure_band_login(text, text),
  public.change_member_pin(text, text, uuid), public.end_band_session() from public, anon;
grant execute on function public.current_band_identity(), public.begin_band_access(text, text),
  public.band_access_context(), public.member_pin_login(uuid, text),
  public.register_band_profile(text, text, text), public.create_code_band(text, text, text, text, text, text),
  public.unlock_band_admin(text), public.band_login_settings(), public.configure_band_login(text, text),
  public.change_member_pin(text, text, uuid), public.end_band_session() to authenticated;
commit;
