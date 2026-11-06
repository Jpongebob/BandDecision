begin;select plan(10);
set local role authenticated;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select is((select count(*)::int from public.band_song_votes where song_id=current_setting('qa.upgrade.song')::bigint),1,'migration deduplicates historical votes');
select is((select choice from public.band_song_votes where song_id=current_setting('qa.upgrade.song')::bigint),'no','latest historical vote preserved');
select is((select reason from public.band_song_votes where song_id=current_setting('qa.upgrade.song')::bigint),'latest pre-upgrade vote','latest reason preserved');
-- 023 stops reading unavailable dates for planning but archives them unchanged (never converted to availability).
select is((select count(*)::int from public.unavailable_dates where band_id=current_setting('qa.upgrade.band')::uuid),2,'all existing saved dates preserved');
select is((select count(*)::int from public.confirmed_plans),1,'existing confirmed plan preserved');
select is((select version from public.confirmed_plans where id=current_setting('qa.upgrade.plan')::uuid),1,'existing plan gets initial edit version');
select is((select round_id::text from public.confirmed_plans where id=current_setting('qa.upgrade.plan')::uuid),current_setting('qa.upgrade.round'),'historical link retained without requiring it for new plans');
-- Since 023 only members who saved a date attend it: the migrated leader opts in to the edited date.
select public.save_band_availability(jsonb_build_array(jsonb_build_object('date',((now() at time zone 'Asia/Seoul')::date+1)::text)));
select lives_ok($$select public.save_rehearsal_plan(current_setting('qa.upgrade.band')::uuid,(now() at time zone 'Asia/Seoul')::date+1,array[current_setting('qa.upgrade.song')::bigint],(public.band_planning_context()->>'version')::bigint,current_setting('qa.upgrade.plan')::uuid,1,false)$$,'may edit migrated plan while retaining historical selected song even if current votes changed');
select is((select title_snapshot from public.confirmed_plan_songs where plan_id=current_setting('qa.upgrade.plan')::uuid),'[테스트 A] 바로 추천되는 곡','historical selected song snapshot retained after edit');
select is((select count(*)::int from public.confirmed_plans),1,'migration edit keeps original plan identity');
select * from finish();rollback;
