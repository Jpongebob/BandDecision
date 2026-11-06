begin;select plan(11);
set local role authenticated;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
-- Stay inside the 023 entry window (today through the end of next month) on any calendar day.
select set_config('qa.date.day',((now() at time zone 'Asia/Seoul')::date+20)::text,true);
select set_config('qa.date.me',public.current_band_identity()->'member'->>'id',true);
-- 023 replaces reason-free unavailable dates with explicitly saved available dates.
select lives_ok($$select public.save_band_availability(jsonb_build_array(jsonb_build_object('date',current_setting('qa.date.day'))))$$,'save date without reason');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='available_dates' and column_name='reason'),'available dates store no reason');
select lives_ok($$select public.update_band_availability(current_setting('qa.date.day')::date,current_setting('qa.date.day')::date+1)$$,'edit date without reason');
select public.save_band_availability(jsonb_build_array(jsonb_build_object('date',current_setting('qa.date.day'),'reason','historic reason')));
select is((select count(*)::int from public.available_dates where member_id=current_setting('qa.date.me')::uuid and available_date in (current_setting('qa.date.day')::date,current_setting('qa.date.day')::date+1)),2,'legacy reason submissions keep only the date');
select throws_ok($$select public.save_band_availability(jsonb_build_array(jsonb_build_object('date','2026-02-30')))$$,'P0001','INVALID_INPUT','nonexistent date rejected');
select throws_ok($$select public.save_band_availability(jsonb_build_array(jsonb_build_object('date',((now() at time zone 'Asia/Seoul')::date-1)::text)))$$,'P0001','INVALID_INPUT','past date rejected');
select lives_ok($$select public.delete_band_availability(current_setting('qa.date.day')::date+1)$$,'delete date-only saved entry');
select ok(not has_function_privilege('authenticated','public.save_band_unavailability(jsonb)','execute'),'legacy unavailable-date writes revoked');
select is((select count(*)::int from public.unavailable_dates where reason<>''),0,'all existing date reasons erased');
select is((select count(*)::int from public.confirmed_plan_members where reason_snapshot is not null),0,'all historical confirmed absence reasons erased');
select ok((select count(*) from public.band_song_votes where choice='no' and reason is not null)>0,'negative song-vote reasons retained');
select * from finish();rollback;
