begin;
select plan(9);
insert into auth.users(id,is_anonymous) values('f9100000-0000-4000-8000-000000000001',true),('f9100000-0000-4000-8000-000000000002',true);
select ok(obj_description('public.band_home_context()'::regprocedure,'pg_proc') like '029:%','029 marker is on the home summary');
select ok(not has_function_privilege('anon','public.band_home_context()','execute'),'anonymous role still cannot read the home summary');
set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select public.create_code_band('Home songs','Leader','기타','1234','112233');
select set_config('qa.h29.band',public.current_band_identity()->>'band_id',true);
select set_config('qa.h29.code',public.band_login_settings()->>'code',true);
select public.save_band_availability((select jsonb_agg(jsonb_build_object('date',((now() at time zone 'Asia/Seoul')::date+n)::text)) from generate_series(1,4) n));
-- Three confirmed songs, saved in the order C, A, B on the first plan; the second plan has none.
select set_config('qa.h29.a',public.add_song(current_setting('qa.h29.band')::uuid,'Song A','Artist')::text,true);
select set_config('qa.h29.b',public.add_song(current_setting('qa.h29.band')::uuid,'Song B','Artist')::text,true);
select set_config('qa.h29.c',public.add_song(current_setting('qa.h29.band')::uuid,'Song C','Artist')::text,true);
select public.set_song_confirmation(current_setting('qa.h29.'||x)::bigint,true) from unnest(array['a','b','c']) x;
select public.save_rehearsal_plan(current_setting('qa.h29.band')::uuid,(now() at time zone 'Asia/Seoul')::date+1,array[current_setting('qa.h29.c')::bigint,current_setting('qa.h29.a')::bigint,current_setting('qa.h29.b')::bigint],(public.band_planning_context()->>'version')::bigint,null,null,false);
select public.save_rehearsal_plan(current_setting('qa.h29.band')::uuid,(now() at time zone 'Asia/Seoul')::date+2,'{}',(public.band_planning_context()->>'version')::bigint,null,null,false);

select is((select jsonb_agg(x->>'title_snapshot') from jsonb_array_elements(public.band_home_context()->'upcoming_plans'->0->'confirmed_plan_songs') x),'["Song C", "Song A", "Song B"]'::jsonb,'nearest plan lists its songs in plan order');
select is(public.band_home_context()->'upcoming_plans'->1->'confirmed_plan_songs','[]'::jsonb,'a date-only plan sends an empty song list');
select is(public.band_home_context()->'next_plan',public.band_home_context()->'upcoming_plans'->0,'next_plan stays the first upcoming plan');
select is(public.band_home_context()->>'upcoming_plan_count','2','plan count unchanged');
select is(jsonb_typeof(public.band_home_context()->'upcoming_plans'->0->'confirmed_plan_songs'->0->'title_snapshot'),'string','only titles are sent for each song');
select is((select count(*)::int from jsonb_object_keys(public.band_home_context()->'upcoming_plans'->0->'confirmed_plan_songs'->0)),1,'no artist or source ids on the home');

-- Another band's member sees nothing of this band.
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000002',true);
select public.create_code_band('Other band','Other','드럼','5678','445566');
select is(public.band_home_context()->>'upcoming_plan_count','0','home summary stays inside the caller''s band');
select * from finish();
rollback;
