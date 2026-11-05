-- Test-only records persisted across the 010 -> 011 migration, never used in production.
begin;
insert into auth.users(id,is_anonymous) values('c1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select public.create_test_band('Before upgrade','test1234','123456');
select set_config('qa.upgrade.band',public.current_band_identity()->>'band_id',false);
select set_config('qa.upgrade.song',(select id::text from public.songs where band_id=current_setting('qa.upgrade.band')::uuid and title like '[테스트 A]%'),false);
select set_config('qa.upgrade.round',(select id::text from public.planning_rounds where band_id=current_setting('qa.upgrade.band')::uuid and status='collecting'),false);
select set_config('qa.upgrade.plan',public.confirm_rehearsal_plan(current_setting('qa.upgrade.round')::uuid,(now() at time zone 'Asia/Seoul')::date,array[current_setting('qa.upgrade.song')::bigint],(select version from public.planning_rounds where id=current_setting('qa.upgrade.round')::uuid),false)::text,false);
select set_config('qa.upgrade.round2',public.start_round(current_setting('qa.upgrade.band')::uuid)::text,false);
select public.cast_vote(current_setting('qa.upgrade.round2')::uuid,current_setting('qa.upgrade.song')::bigint,'no','latest pre-upgrade vote');
reset role;
update public.song_votes set updated_at='2000-01-01' where round_id=current_setting('qa.upgrade.round')::uuid;
commit;reset role;
