begin;
select plan(37);
insert into auth.users(id,aud,role,is_anonymous,raw_user_meta_data)
select ('30000000-0000-4000-8000-00000000000'||n)::uuid,'authenticated','authenticated',true,'{}' from generate_series(1,5)n;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data) values
('30000000-0000-4000-8000-000000000006','authenticated','authenticated','handoff-legacy1@test.invalid',now(),'{}'),
('30000000-0000-4000-8000-000000000007','authenticated','authenticated','handoff-legacy2@test.invalid',now(),'{}');
insert into public.bands(id,name,leader_user_id) values
('30000000-0000-4000-8000-000000001001','Handoff band','30000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000001002','Other band','30000000-0000-4000-8000-000000000003'),
('30000000-0000-4000-8000-000000001003','Legacy band','30000000-0000-4000-8000-000000000006');
insert into public.band_members(id,band_id,user_id,part_key,part_label,role,status) values
('30000000-0000-4000-8000-000000002001','30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000000001','guitar','기타','leader','active'),
('30000000-0000-4000-8000-000000002002','30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000000002','guitar','기타','member','active'),
('30000000-0000-4000-8000-000000002003','30000000-0000-4000-8000-000000001002','30000000-0000-4000-8000-000000000003','drums','드럼','leader','active'),
('30000000-0000-4000-8000-000000002004','30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000000004','bass','베이스','member','left'),
('30000000-0000-4000-8000-000000002005','30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000000005','bass','베이스','member','active'),
('30000000-0000-4000-8000-000000002006','30000000-0000-4000-8000-000000001003','30000000-0000-4000-8000-000000000006','guitar','기타','leader','active'),
('30000000-0000-4000-8000-000000002007','30000000-0000-4000-8000-000000001003','30000000-0000-4000-8000-000000000007','drums','드럼','member','active');
insert into private.band_login_credentials(band_id,code,password_hash,admin_pin_hash) values
('30000000-0000-4000-8000-000000001001','ABCDEF1234',extensions.crypt('1234',extensions.gen_salt('bf',4)),extensions.crypt('987654',extensions.gen_salt('bf',4))),
('30000000-0000-4000-8000-000000001002','FEDCBA4321',extensions.crypt('5678',extensions.gen_salt('bf',4)),extensions.crypt('654987',extensions.gen_salt('bf',4)));
insert into private.member_pins(user_id,pin_hash,guest_owned) values
('30000000-0000-4000-8000-000000000001',extensions.crypt('111111',extensions.gen_salt('bf',4)),true),
('30000000-0000-4000-8000-000000000002',extensions.crypt('222222',extensions.gen_salt('bf',4)),true),
('30000000-0000-4000-8000-000000000003',extensions.crypt('333333',extensions.gen_salt('bf',4)),true);
insert into private.member_sessions(session_user_id,actor_id,band_id,credential_version,admin_until) values
('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000001001',1,now()+interval '30 minutes'),
('30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000001001',1,null),
('30000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000001002',1,now()+interval '30 minutes');
insert into public.planning_rounds(id,band_id,start_date,end_date,status,created_by) values
('30000000-0000-4000-8000-000000003001','30000000-0000-4000-8000-000000001001','2026-11-05','2027-01-03','closed','30000000-0000-4000-8000-000000000001');
insert into public.confirmed_plans(id,band_id,round_id,rehearsal_date,participant_count,attendee_count,confirmed_by) values
('30000000-0000-4000-8000-000000004001','30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000003001','2026-11-05',2,2,'30000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","is_anonymous":true}',true);
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002001','666666')$$,'P0001','FORBIDDEN','ordinary member cannot take or assign leadership');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","is_anonymous":true}',true);
select ok((public.current_band_identity()->>'code_enabled')::boolean,'code mode is available to the transfer UI');
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002001','666666')$$,'P0001','INVALID_TARGET','cannot transfer to oneself');
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002003','666666')$$,'P0001','INVALID_TARGET','cross-band target denied');
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002004','666666')$$,'P0001','INVALID_TARGET','inactive target denied');
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002005','666666')$$,'P0001','TARGET_PIN_REQUIRED','new code leader must have a personal PIN');
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002002')$$,'P0001','ADMIN_PIN_REQUIRED','old two-argument call cannot bypass the new PIN requirement');
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002002','123')$$,'P0001','ADMIN_PIN_REQUIRED','short administrator PIN rejected');
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002002','222222')$$,'P0001','ADMIN_PIN_SAME_AS_PERSONAL','new admin PIN cannot equal recipient personal PIN');
reset role;
update private.member_sessions set admin_until=now()-interval '1 minute' where session_user_id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002002','666666')$$,'P0001','FORBIDDEN','expired administrator elevation cannot transfer');
reset role;
update private.member_sessions set admin_until=now()+interval '30 minutes' where session_user_id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select lives_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002002','666666')$$,'elevated leader transfers leadership atomically');
select is((select role from public.band_members where id='30000000-0000-4000-8000-000000002001'),'member','old leader becomes an ordinary member');
select is((select role from public.band_members where id='30000000-0000-4000-8000-000000002002'),'leader','target becomes leader');
select is((select leader_user_id from public.bands where id='30000000-0000-4000-8000-000000001001'),'30000000-0000-4000-8000-000000000002'::uuid,'band owner points to the new canonical actor');
select is((select count(*)::integer from public.band_members where band_id='30000000-0000-4000-8000-000000001001' and role='leader' and status='active'),1,'exactly one active leader remains');
select is((select confirmed_by from public.confirmed_plans where id='30000000-0000-4000-8000-000000004001'),'30000000-0000-4000-8000-000000000001'::uuid,'confirmed plan attribution is not rewritten by handoff');
select ok(not private.is_band_leader('30000000-0000-4000-8000-000000001001'),'old actor immediately loses administration');
select throws_ok($$select public.start_round('30000000-0000-4000-8000-000000001001')$$,'P0001','FORBIDDEN','old leader cannot start a round after handoff');
select throws_ok($$select public.remove_member('30000000-0000-4000-8000-000000002002')$$,'P0001','FORBIDDEN','old leader cannot remove the new leader');
select throws_ok($$select public.update_member_skill('30000000-0000-4000-8000-000000002002',5::smallint)$$,'P0001','FORBIDDEN','old leader cannot change member skill');
select is(public.configure_band_login('new-password','777777')->>'error','FORBIDDEN','old leader cannot rotate shared credentials');
select is(public.change_member_pin('777777',null,'30000000-0000-4000-8000-000000002002')->>'error','FORBIDDEN','old leader cannot reset new leader personal PIN');
select throws_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001001','30000000-0000-4000-8000-000000002001','777777')$$,'P0001','FORBIDDEN','stale old-leader action cannot take leadership back');
reset role;
select is((select count(*)::integer from private.member_sessions where band_id='30000000-0000-4000-8000-000000001001' and admin_until is not null),0,'all old administrator elevations cleared');
select is((select count(*)::integer from private.member_sessions where band_id='30000000-0000-4000-8000-000000001001'),2,'personal sessions remain usable after handoff');
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","is_anonymous":true}',true);
select ok(not private.is_band_leader('30000000-0000-4000-8000-000000001001'),'new code leader must enter the new administrator PIN');
select is(public.unlock_band_admin('987654')->>'error','BAD_PIN','old administrator PIN no longer works');
select ok((public.unlock_band_admin('666666')->>'ok')::boolean,'new administrator PIN unlocks new leader');
select ok(private.is_band_leader('30000000-0000-4000-8000-000000001001'),'new leader can administer after unlocking');
select lives_ok($$select public.update_member_skill('30000000-0000-4000-8000-000000002002',4::smallint)$$,'new leader may update their own skill');
select lives_ok($$select public.start_round('30000000-0000-4000-8000-000000001001')$$,'new leader may create a round');
select ok(not has_table_privilege('authenticated','public.band_members','UPDATE'),'leadership cannot be changed by direct table update');
select ok(not has_function_privilege('anon','public.transfer_leadership(uuid,uuid,text)','EXECUTE'),'public anon API key cannot transfer leadership');
select ok(to_regprocedure('public.transfer_leadership(uuid,uuid)') is null,'obsolete unrestricted signature removed');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000006',true);
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000006","is_anonymous":false}',true);
select lives_ok($$select public.transfer_leadership('30000000-0000-4000-8000-000000001003','30000000-0000-4000-8000-000000002007')$$,'legacy email bands retain transfer without a code-only administrator PIN');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000007',true);
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000007","is_anonymous":false}',true);
select ok(private.is_band_leader('30000000-0000-4000-8000-000000001003'),'legacy new leader can manage their band');
select ok(not (public.current_band_identity()->>'code_enabled')::boolean,'legacy mode is reported correctly');
select * from finish();
rollback;
