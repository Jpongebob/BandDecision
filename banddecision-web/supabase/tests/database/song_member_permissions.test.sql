begin;
select plan(20);

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('00000000-0000-4000-8000-000000000001','authenticated','authenticated','song-leader@example.test','',now(),'{}','{"nickname":"Leader"}',now(),now()),
 ('00000000-0000-4000-8000-000000000002','authenticated','authenticated','song-member@example.test','',now(),'{}','{"nickname":"Member"}',now(),now()),
 ('00000000-0000-4000-8000-000000000003','authenticated','authenticated','song-outsider@example.test','',now(),'{}','{"nickname":"Outsider"}',now(),now());

insert into public.bands(id,name,leader_user_id) values
 ('00000000-0000-4000-8000-000000001001','Member song test','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000001002','Other band test','00000000-0000-4000-8000-000000000003');
insert into public.band_members(id,band_id,user_id,part_key,part_label,role) values
 ('00000000-0000-4000-8000-000000002001','00000000-0000-4000-8000-000000001001','00000000-0000-4000-8000-000000000001','guitar','Guitar','leader'),
 ('00000000-0000-4000-8000-000000002002','00000000-0000-4000-8000-000000001001','00000000-0000-4000-8000-000000000002','guitar','Guitar','member'),
 ('00000000-0000-4000-8000-000000002003','00000000-0000-4000-8000-000000001002','00000000-0000-4000-8000-000000000003','drums','Drums','leader');
insert into public.songs(id,band_id,title,artist,created_by) overriding system value values
 (900001,'00000000-0000-4000-8000-000000001001','Leader song','Leader artist','00000000-0000-4000-8000-000000000001'),
 (900002,'00000000-0000-4000-8000-000000001002','Private song','Other artist','00000000-0000-4000-8000-000000000003');
insert into public.planning_rounds(id,band_id,start_date,end_date,status,created_by) values
 ('00000000-0000-4000-8000-000000003001','00000000-0000-4000-8000-000000001001','2026-11-05','2027-01-03','closed','00000000-0000-4000-8000-000000000001');
insert into public.confirmed_plans(id,band_id,round_id,rehearsal_date,participant_count,attendee_count,confirmed_by) values
 ('00000000-0000-4000-8000-000000004001','00000000-0000-4000-8000-000000001001','00000000-0000-4000-8000-000000003001','2026-11-10',1,1,'00000000-0000-4000-8000-000000000001');
insert into public.confirmed_plan_songs(id,plan_id,source_song_id,title_snapshot,artist_snapshot,display_order) values
 ('00000000-0000-4000-8000-000000005001','00000000-0000-4000-8000-000000004001',900001,'Leader song','Leader artist',1);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.update_song_difficulty(900001,'guitar',3::smallint,0)$$,'ordinary member can edit a candidate song added by the leader');
select is((select updated_by::text from public.song_difficulties where song_id=900001 and part_key='guitar'),'00000000-0000-4000-8000-000000000002','editing another member song records the editor');
select is((select title_snapshot from public.confirmed_plan_songs where id='00000000-0000-4000-8000-000000005001'),'Leader song','difficulty edits do not mutate confirmed plan snapshots');
select lives_ok($$select public.add_song('00000000-0000-4000-8000-000000001001','Member song','Test artist')$$,'ordinary member can add a candidate song');
select set_config('test.song_id',(select id::text from public.songs where band_id='00000000-0000-4000-8000-000000001001' and title='Member song'),true);
select is((select count(*)::integer from public.songs where id=current_setting('test.song_id')::bigint),1,'member-created candidate is visible inside the same band');
select lives_ok($$select public.update_song_difficulty(current_setting('test.song_id')::bigint,'guitar',4::smallint,0)$$,'ordinary member can create a part difficulty');
select is((select updated_by::text from public.song_difficulties where song_id=current_setting('test.song_id')::bigint and part_key='guitar'),'00000000-0000-4000-8000-000000000002','difficulty records the member who changed it');
select ok((select updated_at is not null from public.song_difficulties where song_id=current_setting('test.song_id')::bigint and part_key='guitar'),'difficulty records its update time');
select is((select version from public.song_difficulties where song_id=current_setting('test.song_id')::bigint and part_key='guitar'),1,'new difficulty starts at version one');
select lives_ok($$select public.update_song_difficulty(current_setting('test.song_id')::bigint,'guitar',5::smallint,1)$$,'ordinary member can edit a difficulty using its current version');
select is((select difficulty::integer from public.song_difficulties where song_id=current_setting('test.song_id')::bigint and part_key='guitar'),5,'updated difficulty is stored');
select is((select version from public.song_difficulties where song_id=current_setting('test.song_id')::bigint and part_key='guitar'),2,'successful edit advances the difficulty version');
select throws_ok($$select public.update_song_difficulty(current_setting('test.song_id')::bigint,'guitar',3::smallint,1)$$,'P0001','DIFFICULTY_STALE','stale concurrent edit is rejected');
select is((select count(*)::integer from public.songs where id=900002),0,'member cannot read another band candidate');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.add_song('00000000-0000-4000-8000-000000001001','Cross-band song','Test artist')$$,'P0001','FORBIDDEN','member cannot add a song to another band');
select throws_ok($$select public.update_song_difficulty(900001,'guitar',3::smallint,0)$$,'P0001','FORBIDDEN','member cannot change another band difficulty');
select ok(not has_table_privilege('authenticated','public.songs','INSERT') and not has_table_privilege('authenticated','public.song_difficulties','UPDATE'),'direct table writes remain revoked; members use validated RPCs');
select ok(has_function_privilege('authenticated','public.update_song_difficulty(bigint,text,smallint,integer)','EXECUTE'),'authenticated members can use the versioned difficulty RPC');
select ok(not has_function_privilege('anon','public.update_song_difficulty(bigint,text,smallint,integer)','EXECUTE'),'anonymous users cannot use the difficulty RPC');
select ok((select relrowsecurity from pg_class where oid='public.songs'::regclass) and (select relrowsecurity from pg_class where oid='public.song_difficulties'::regclass) and exists(select 1 from pg_policies where schemaname='public' and tablename='songs' and policyname='songs_member_insert') and exists(select 1 from pg_policies where schemaname='public' and tablename='song_difficulties' and policyname='difficulties_member_update'),'song and difficulty tables enforce member-scoped RLS');
select * from finish();
rollback;
