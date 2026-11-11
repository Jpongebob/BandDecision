-- 029: 홈의 가까운 합주(최대 3개)에 곡 제목을 함께 보낸다. 화면은 몇 곡만 보여 주고 나머지는 '+N곡'.
-- 025와 같은 함수이고 곡 제목만 채운다(이전에는 빈 배열). 다른 응답 값과 권한은 그대로다.
begin;
do $$ begin
 if to_regprocedure('public.band_home_context()') is null then
  raise exception '202611050025_home_upcoming_plans.sql을 먼저 적용하세요';
 end if;
end $$;
create or replace function public.band_home_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; plans jsonb; today date:=(now() at time zone 'Asia/Seoul')::date;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',cp.id,'rehearsal_date',cp.rehearsal_date,
  'location',cp.location,'memo',left(cp.memo,600),'starts_at',cp.starts_at,'ends_at',cp.ends_at,
  'participant_count',cp.participant_count,'attendee_count',cp.attendee_count,
  'confirmed_plan_songs',coalesce((select jsonb_agg(jsonb_build_object('title_snapshot',s.title_snapshot) order by s.display_order,s.id)
   from public.confirmed_plan_songs s where s.plan_id=cp.id),'[]'::jsonb))
  order by cp.rehearsal_date,cp.confirmed_at,cp.id),'[]'::jsonb) into plans
 from (select * from public.confirmed_plans where band_id=b and rehearsal_date>=today
  order by rehearsal_date,confirmed_at,id limit 3) cp;
 return jsonb_build_object('member_count',(select count(*) from public.band_members where band_id=b and status='active'),
  'upcoming_plan_count',(select count(*) from public.confirmed_plans where band_id=b and rehearsal_date>=today),
  'upcoming_plans',plans,'next_plan',plans->0,
  -- Retain the response shape for clients loaded before deployment.
  'skill_enabled',false,'pending_votes',0,'unset_skills',0,'my_skill',null,'upcoming_available','[]'::jsonb);
end $$;
comment on function public.band_home_context() is '029: 홈 합주에 곡 제목 포함';
revoke all on function public.band_home_context() from public,anon;
grant execute on function public.band_home_context() to authenticated;
notify pgrst,'reload schema';
commit;
