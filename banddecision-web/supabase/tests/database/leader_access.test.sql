begin;
select plan(12);
insert into auth.users(id,aud,role,is_anonymous,raw_user_meta_data)
select ('50000000-0000-4000-8000-00000000000'||n)::uuid,'authenticated','authenticated',true,'{}' from generate_series(1,2)n;
insert into public.bands(id,name,leader_user_id) values
('50000000-0000-4000-8000-000000001001','No extra unlock','50000000-0000-4000-8000-000000000001');
insert into public.band_members(id,band_id,user_id,part_key,part_label,role) values
('50000000-0000-4000-8000-000000002001','50000000-0000-4000-8000-000000001001','50000000-0000-4000-8000-000000000001','guitar','기타','leader'),
('50000000-0000-4000-8000-000000002002','50000000-0000-4000-8000-000000001001','50000000-0000-4000-8000-000000000002','guitar','기타','member');
insert into private.band_login_credentials(band_id,code,password_hash,admin_pin_hash)
values('50000000-0000-4000-8000-000000001001','ABCDE12345',extensions.crypt('1234',extensions.gen_salt('bf',4)),extensions.crypt('987654',extensions.gen_salt('bf',4)));
insert into private.member_pins(user_id,pin_hash,guest_owned)
select id,extensions.crypt('123456',extensions.gen_salt('bf',4)),true from auth.users where id in ('50000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002');
insert into private.member_sessions(session_user_id,actor_id,band_id,credential_version,admin_until)
select user_id,user_id,band_id,1,null from public.band_members where band_id='50000000-0000-4000-8000-000000001001';
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","is_anonymous":true}',true);
select ok(private.is_band_leader('50000000-0000-4000-8000-000000001001'),'PIN-verified leader has rights with admin_until null');
select ok((public.current_band_identity()->>'admin_unlocked')::boolean,'identity advertises immediate leader authorization');
select ok((public.band_login_settings()->>'admin_unlocked')::boolean,'legacy settings flag stays compatible with immediate authorization');
select ok(not private.is_band_leader('50000000-0000-4000-8000-000000001999'),'leader has no authority over another band');
select lives_ok($$select public.update_member_skill('50000000-0000-4000-8000-000000002002',4::smallint)$$,'leader manages members without extra unlock');
select lives_ok($$select public.create_invite('50000000-0000-4000-8000-000000001001')$$,'leader creates invite without extra unlock');
select set_config('test.round',public.start_round('50000000-0000-4000-8000-000000001001')::text,true);
select set_config('test.song',public.add_song('50000000-0000-4000-8000-000000001001','No unlock song','Band')::text,true);
select public.update_song_difficulty(current_setting('test.song')::bigint,'guitar',2::smallint,0);
select public.save_unavailability(current_setting('test.round')::uuid,'[]',false);
select public.cast_vote(current_setting('test.round')::uuid,current_setting('test.song')::bigint,'yes',null);
select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000002","is_anonymous":true}',true);
select ok(not private.is_band_leader('50000000-0000-4000-8000-000000001001'),'ordinary member never receives leader rights');
select throws_ok($$select public.update_member_skill('50000000-0000-4000-8000-000000002001',5::smallint)$$,'P0001','FORBIDDEN','member management remains denied');
select public.save_unavailability(current_setting('test.round')::uuid,'[]',false);
select public.cast_vote(current_setting('test.round')::uuid,current_setting('test.song')::bigint,'yes',null);
select throws_ok($$select public.confirm_rehearsal_plan(current_setting('test.round')::uuid,(now() at time zone 'Asia/Seoul')::date,array[current_setting('test.song')::bigint],(select version from public.planning_rounds where id=current_setting('test.round')::uuid),false)$$,'P0001','FORBIDDEN','ordinary member cannot finalize');
select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","is_anonymous":true}',true);
select lives_ok($$select public.confirm_rehearsal_plan(current_setting('test.round')::uuid,(now() at time zone 'Asia/Seoul')::date,array[current_setting('test.song')::bigint],(select version from public.planning_rounds where id=current_setting('test.round')::uuid),false)$$,'leader finalizes without ever unlocking administrator PIN');
reset role;
update private.member_sessions set expires_at=now()-interval '1 minute' where actor_id='50000000-0000-4000-8000-000000000001';
set local role authenticated;
select ok(not private.is_band_leader('50000000-0000-4000-8000-000000001001'),'expired personal login still loses access');
select throws_ok($$select public.start_round('50000000-0000-4000-8000-000000001001')$$,'P0001','FORBIDDEN','expired personal login cannot administer');
select * from finish();
rollback;
