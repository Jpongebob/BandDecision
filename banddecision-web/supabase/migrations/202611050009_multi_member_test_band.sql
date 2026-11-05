begin;
create table private.test_band_fixtures (
 band_id uuid primary key references public.bands(id) on delete cascade,
 prepared_round_id uuid references public.planning_rounds(id) on delete set null
);
create table private.test_band_members (
 band_id uuid not null references private.test_band_fixtures(band_id) on delete cascade,
 slot text not null check(slot in ('guitar2','bass','drums','vocal')),
 user_id uuid not null unique references public.profiles(id) on delete cascade,
 primary key(band_id,slot)
);
revoke all on private.test_band_fixtures,private.test_band_members from public,anon,authenticated;
-- Recognize only original one-member fixtures with all four generated songs.
insert into private.test_band_fixtures(band_id)
select b.id from public.bands b
where b.name='[테스트] 합주 연습실'
 and (select count(*) from public.band_members m where m.band_id=b.id and m.status='active')=1
 and (select count(*) from public.songs s where s.band_id=b.id and s.created_by=b.leader_user_id and s.artist='테스트 밴드' and s.title in
 ('[테스트 A] 바로 추천되는 곡','[테스트 B] 내 투표를 기다리는 곡','[테스트 C] 반대로 보류되는 곡','[테스트 D] 난이도를 등록할 곡'))=4;
create or replace function public.create_test_band(p_nickname text, p_password text, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  result jsonb; band uuid; round_id uuid; song bigint; compatibility_pin text;
  leader uuid := auth.uid(); today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if leader is null then return jsonb_build_object('error','UNAUTHENTICATED'); end if;
  if not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    return jsonb_build_object('error','GUEST_SESSION_REQUIRED');
  end if;
  -- Satisfy legacy storage constraints without exposing another PIN in the test flow.
  compatibility_pin := case when p_pin = '999999' then '888888' else '999999' end;
  result := public.create_code_band('[테스트] 합주 연습실',p_nickname,'기타',p_password,p_pin,compatibility_pin);
  if result->>'error' is not null then return result; end if;
  band := (public.current_band_identity()->>'band_id')::uuid;
  insert into private.test_band_fixtures(band_id) values(band);
  perform public.update_member_skill((select id from public.band_members where band_id=band and user_id=leader),3::smallint);
  round_id := public.start_round(band);
  perform public.save_unavailability(round_id,
    jsonb_build_array(jsonb_build_object('date',(today+3)::text,'reason','[테스트] 개인 일정'),
                     jsonb_build_object('date',(today+7)::text,'reason','[테스트] 다른 약속')),false);

  song := public.add_song(band,'[테스트 A] 바로 추천되는 곡','테스트 밴드');
  perform public.update_song_difficulty(song,'기타',2::smallint,0);
  perform public.cast_vote(round_id,song,'yes',null);
  song := public.add_song(band,'[테스트 B] 내 투표를 기다리는 곡','테스트 밴드');
  perform public.update_song_difficulty(song,'기타',3::smallint,0);
  song := public.add_song(band,'[테스트 C] 반대로 보류되는 곡','테스트 밴드');
  perform public.update_song_difficulty(song,'기타',5::smallint,0);
  perform public.cast_vote(round_id,song,'no','[테스트] 연습 시간이 더 필요해요');
  song := public.add_song(band,'[테스트 D] 난이도를 등록할 곡','테스트 밴드');
  perform public.cast_vote(round_id,song,'yes',null);
  return jsonb_build_object('ok',true,'code',(select code from private.band_login_credentials where band_id=band));
end $$;

create function public.test_band_setup_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('code',c.code,'prepared',f.prepared_round_id is not null,
  'members',coalesce((select jsonb_agg(jsonb_build_object('slot',t.slot,'nickname',p.nickname,'part',m.part_label))
   from private.test_band_members t join public.profiles p on p.id=t.user_id
   join public.band_members m on m.user_id=t.user_id and m.band_id=t.band_id and m.status='active'
   where t.band_id=f.band_id),'[]'::jsonb))
 from private.test_band_fixtures f join public.band_members me on me.band_id=f.band_id
 join private.band_login_credentials c on c.band_id=f.band_id
 where me.user_id=private.actor_id() and me.status='active' and private.is_band_leader(f.band_id)
$$;

create function public.register_test_member(p_slot text,p_pin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid; label text; nick text; result jsonb; u uuid:=auth.uid();
begin
 select g.band_id into b from private.band_access_grants g
 join private.band_login_credentials c on c.band_id=g.band_id and c.version=g.credential_version
 join private.test_band_fixtures f on f.band_id=g.band_id
 where g.session_user_id=u and g.expires_at>now();
 if b is null then return jsonb_build_object('error','FORBIDDEN'); end if;
 perform 1 from public.bands where id=b for update;
 if p_pin is null or p_pin !~ '^[0-9]{6}$' then return jsonb_build_object('error','INVALID_INPUT'); end if;
 if exists(select 1 from private.test_band_members t join private.member_pins pin on pin.user_id=t.user_id
  where t.band_id=b and extensions.crypt(p_pin,pin.pin_hash)<>pin.pin_hash) then
  return jsonb_build_object('error','TEST_PIN_MISMATCH');
 end if;
 if exists(select 1 from private.test_band_members where band_id=b and slot=p_slot) then
  return jsonb_build_object('ok',true,'already_registered',true);
 end if;
 case p_slot
 when 'guitar2' then label:='기타';nick:='테스트 기타2';
 when 'bass' then label:='베이스';nick:='테스트 베이스';
 when 'drums' then label:='드럼';nick:='테스트 드럼';
 when 'vocal' then label:='보컬';nick:='테스트 보컬';
 else return jsonb_build_object('error','INVALID_INPUT');
 end case;
 if exists(select 1 from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active' and p.nickname=nick) then nick:=nick||' (멤버)'; end if;
 if exists(select 1 from public.bands x join private.member_pins pin on pin.user_id=x.leader_user_id where x.id=b and extensions.crypt(p_pin,pin.pin_hash)=pin.pin_hash) then
  return jsonb_build_object('error','INVALID_INPUT');
 end if;
 result:=public.register_band_profile(nick,label,p_pin);
 if result->>'error' is not null then return result; end if;
 insert into private.test_band_members(band_id,slot,user_id) values(b,p_slot,u);
 return jsonb_build_object('ok',true);
end $$;

create function public.prepare_test_band() returns jsonb
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
 if saved is not null then return jsonb_build_object('ok',true); end if;
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
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.test_band_setup_status(), public.register_test_member(text,text),public.prepare_test_band() from public,anon;
grant execute on function public.test_band_setup_status(), public.register_test_member(text,text),public.prepare_test_band() to authenticated;
notify pgrst,'reload schema';
commit;
