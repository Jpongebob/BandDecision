-- Optional single-band start page. Off by default; personal PIN authentication remains mandatory.
begin;
create table private.site_entry (
 singleton boolean primary key default true check(singleton),
 band_id uuid references public.bands(id) on delete set null
);
insert into private.site_entry(singleton) values(true);
revoke all on private.site_entry from public,anon,authenticated;
alter table private.band_access_grants add column direct_entry boolean not null default false;
create function public.set_direct_band_entry(p_enabled boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid; selected uuid;
begin
 select band_id into selected from private.site_entry where singleton for update;
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return jsonb_build_object('error','FORBIDDEN'); end if;
 perform 1 from public.bands where id=b for update;
 if not private.is_band_leader(b) then return jsonb_build_object('error','FORBIDDEN'); end if;
 if p_enabled is null then return jsonb_build_object('error','INVALID_INPUT'); end if;
 if selected is not null and selected<>b then return jsonb_build_object('error','DIRECT_ENTRY_IN_USE'); end if;
 if p_enabled and not exists(select 1 from private.band_login_credentials where band_id=b) then return jsonb_build_object('error','INVALID_INPUT'); end if;
 update private.site_entry set band_id=case when p_enabled then b else null end where singleton;
 -- Disable all unfinished password-free entry grants, preserving PIN-verified sessions.
 delete from private.band_access_grants where direct_entry;
 return jsonb_build_object('ok',true);
end $$;
create function public.default_band_entry_context() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('band_name',b.name,'profiles',coalesce((
  select jsonb_agg(jsonb_build_object('id',m.id,'nickname',p.nickname,'part',m.part_label,'role',m.role,'pin_ready',pin.user_id is not null) order by m.joined_at,m.id)
  from public.band_members m join public.profiles p on p.id=m.user_id
  left join private.member_pins pin on pin.user_id=m.user_id
  where m.band_id=b.id and m.status='active'),'[]'::jsonb))
 from private.site_entry e join public.bands b on b.id=e.band_id
 join private.band_login_credentials c on c.band_id=b.id where e.singleton
$$;
-- Only called by the two PIN/profile wrappers below. Configuration and band are locked
-- through the PIN verification/registration transaction so disabling cannot race with entry.
create function private.prepare_direct_band_entry() returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid; v integer; u uuid:=auth.uid();
begin
 if u is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then return jsonb_build_object('error','GUEST_SESSION_REQUIRED'); end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select band_id into b from private.site_entry where singleton for update;
 if b is null then return jsonb_build_object('error','DIRECT_ENTRY_DISABLED'); end if;
 perform 1 from public.bands where id=b for update;
 if private.actor_id() is not null then return jsonb_build_object('error','ALREADY_SIGNED_IN'); end if;
 if not private.allow_login_attempt('direct:'||u::text,30) then return jsonb_build_object('error','RATE_LIMITED'); end if;
 select version into v from private.band_login_credentials where band_id=b;
 if not found then return jsonb_build_object('error','DIRECT_ENTRY_DISABLED'); end if;
 insert into private.band_access_grants(session_user_id,band_id,credential_version,direct_entry)
 values(u,b,v,true) on conflict(session_user_id) do update set band_id=excluded.band_id,
 credential_version=excluded.credential_version,direct_entry=true,expires_at=now()+interval '10 minutes';
 return jsonb_build_object('ok',true);
end $$;
create function public.direct_member_pin_login(p_member uuid,p_pin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.prepare_direct_band_entry();
 if result->>'error' is not null then return result; end if;
 return public.member_pin_login(p_member,p_pin);
end $$;
create function public.direct_register_band_profile(p_nickname text,p_part text,p_pin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.prepare_direct_band_entry();
 if result->>'error' is not null then return result; end if;
 return public.register_band_profile(p_nickname,p_part,p_pin);
end $$;
create or replace function public.band_login_settings() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('code',c.code,'role',m.role,'pin_ready',pin.user_id is not null,
 'admin_unlocked',private.is_band_leader(m.band_id),
 'direct_entry_enabled',exists(select 1 from private.site_entry where singleton and band_id=m.band_id))
 from public.band_members m left join private.band_login_credentials c on c.band_id=m.band_id
 left join private.member_pins pin on pin.user_id=m.user_id
 where m.user_id=private.actor_id() and m.status='active'
$$;
revoke all on function private.prepare_direct_band_entry() from public,anon,authenticated;
revoke all on function public.default_band_entry_context(),public.set_direct_band_entry(boolean),public.direct_member_pin_login(uuid,text),public.direct_register_band_profile(text,text,text) from public,anon;
grant execute on function public.default_band_entry_context() to anon,authenticated;
grant execute on function public.set_direct_band_entry(boolean),public.direct_member_pin_login(uuid,text),public.direct_register_band_profile(text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
