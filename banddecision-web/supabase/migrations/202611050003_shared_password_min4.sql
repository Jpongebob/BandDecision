-- Shared band passwords accept 4..64 characters; keep PINs at six digits.
-- Existing password hashes, records, and execute privileges are preserved.
begin;

create or replace function public.begin_band_access(p_code text, p_password text) returns jsonb
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
    or char_length(p_password) not between 4 and 64 or octet_length(p_password) > 72 then
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

create or replace function public.configure_band_login(p_password text, p_admin_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare band uuid; v integer;
begin
  select id into band from public.bands where leader_user_id = private.actor_id();
  if band is null or not private.is_band_leader(band) then return jsonb_build_object('error', 'FORBIDDEN'); end if;
  if p_password is null or char_length(p_password) not between 4 and 64 or octet_length(p_password) > 72
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

commit;
