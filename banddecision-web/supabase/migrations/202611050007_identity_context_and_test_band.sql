begin;
-- Return only the verified canonical actor's active membership and band in the existing RPC.
create or replace function public.current_band_identity() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'nickname', p.nickname, 'band_id', m.band_id,
    'admin_unlocked', coalesce(private.is_band_leader(m.band_id), false),
    'code_enabled', c.band_id is not null, 'context_version', 1,
    'member', case when m.id is null then null else jsonb_build_object(
      'id', m.id, 'band_id', m.band_id, 'role', m.role, 'part_label', m.part_label) end,
    'band', case when b.id is null then null else jsonb_build_object('id', b.id, 'name', b.name) end)
  from public.profiles p
  left join public.band_members m on m.user_id = p.id and m.status = 'active'
  left join public.bands b on b.id = m.band_id
  left join private.band_login_credentials c on c.band_id = m.band_id
  where p.id = private.actor_id()
$$;

-- On-demand fixture: creates a new band for an unassigned device only.
-- Calls normal application RPCs in one transaction; never changes another band or Auth row.
create function public.create_test_band(p_nickname text, p_password text, p_pin text) returns jsonb
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
revoke all on function public.create_test_band(text,text,text) from public, anon;
grant execute on function public.create_test_band(text,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
