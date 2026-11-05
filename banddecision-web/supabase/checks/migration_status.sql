-- READ ONLY. If all six 009_* values are true, 009 is already applied: do not rerun or delete tables.
select
 to_regclass('private.test_band_fixtures') is not null as "009_fixtures",
 to_regclass('private.test_band_members') is not null as "009_members",
 to_regprocedure('public.create_test_band(text,text,text)') is not null as "009_create_band",
 to_regprocedure('public.test_band_setup_status()') is not null as "009_setup_status",
 to_regprocedure('public.register_test_member(text,text)') is not null as "009_register_member",
 to_regprocedure('public.prepare_test_band()') is not null as "009_prepare_band";
-- If true, 010 has already added independent plans. Do not rerun a successful migration.
select to_regprocedure('public.delete_rehearsal_plan(uuid)') is not null
 and not exists(select 1 from pg_constraint where conrelid='public.confirmed_plans'::regclass and conname='confirmed_plans_band_id_key') as "010_applied";
-- After 011 succeeds, this is true.
select to_regprocedure('public.band_planning_context()') is not null
 and to_regprocedure('public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean)') is not null as "011_applied";
