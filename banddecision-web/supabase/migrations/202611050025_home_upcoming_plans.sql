-- Small home summary and an independent menu count; no availability or song snapshots.
begin;
create or replace function public.band_home_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; plans jsonb; today date:=(now() at time zone 'Asia/Seoul')::date;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',cp.id,'rehearsal_date',cp.rehearsal_date,
  'location',cp.location,'memo',left(cp.memo,600),'starts_at',cp.starts_at,'ends_at',cp.ends_at,
  'participant_count',cp.participant_count,'attendee_count',cp.attendee_count,'confirmed_plan_songs','[]'::jsonb)
  order by cp.rehearsal_date,cp.confirmed_at,cp.id),'[]'::jsonb) into plans
 from (select * from public.confirmed_plans where band_id=b and rehearsal_date>=today
  order by rehearsal_date,confirmed_at,id limit 3) cp;
 return jsonb_build_object('member_count',(select count(*) from public.band_members where band_id=b and status='active'),
  'upcoming_plan_count',(select count(*) from public.confirmed_plans where band_id=b and rehearsal_date>=today),
  'upcoming_plans',plans,'next_plan',plans->0,
  -- Retain the response shape for clients loaded before deployment.
  'skill_enabled',false,'pending_votes',0,'unset_skills',0,'my_skill',null,'upcoming_available','[]'::jsonb);
end $$;
create function public.band_pending_vote_count() returns integer
language sql stable security definer set search_path='' as $$
 select count(*)::integer from public.band_members m join public.songs s on s.band_id=m.band_id
 where m.user_id=private.actor_id() and m.status='active' and s.confirmed_at is null
 and not exists(select 1 from public.band_song_votes v where v.song_id=s.id and v.member_id=m.id)
$$;
revoke all on function public.band_pending_vote_count() from public,anon,authenticated;
grant execute on function public.band_pending_vote_count() to authenticated;
notify pgrst,'reload schema';
commit;
