begin;
select plan(42);

insert into auth.users(id, aud, role, is_anonymous, raw_user_meta_data, created_at, updated_at)
select ('10000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', true, '{}', now(), now()
from generate_series(1,5) n;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data,created_at,updated_at)
values('10000000-0000-4000-8000-000000000009','authenticated','authenticated','legacy@band.test',now(),'{"nickname":"Legacy"}',now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',true);
select is(private.actor_id(), null::uuid, 'an unverified guest has no actor');
select is((select count(*)::integer from public.bands), 0, 'an unverified guest reads no band');
select throws_ok($$select public.create_band('Bypass','guitar','Bypass')$$, 'P0001','UNAUTHENTICATED','old create-band RPC cannot bypass code/PIN login');
select ok((public.create_code_band('Code band','Leader','guitar','shared-password','001234','987654')->>'ok')::boolean, 'email-free band creation succeeds');
select set_config('test.band',public.current_band_identity()->>'band_id',true);
select set_config('test.code',public.band_login_settings()->>'code',true);
select is(private.actor_id(),'10000000-0000-4000-8000-000000000001'::uuid,'creator owns the leader identity');
select ok(private.is_band_leader(current_setting('test.band')::uuid),'creator has initial admin elevation');
select set_config('test.leader_member',(select id::text from public.band_members where role='leader'),true);

reset role;
select ok((select password_hash <> 'shared-password' and admin_pin_hash <> '987654' from private.band_login_credentials where band_id=current_setting('test.band')::uuid),'band password and admin PIN are hashed');
select ok((select pin_hash <> '001234' from private.member_pins where user_id='10000000-0000-4000-8000-000000000001'),'member PIN is hashed');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}',true);
select is(public.begin_band_access(current_setting('test.code'),'wrong-password')->>'error','BAD_BAND_CREDENTIALS','wrong band password rejected');
select is(public.band_access_context(),null::jsonb,'wrong password reveals no member list');
select ok((public.begin_band_access(current_setting('test.code'),'shared-password')->>'ok')::boolean,'correct band code and password accepted');
select is(jsonb_array_length(public.band_access_context()->'profiles'),1,'password gate exposes only the profile picker');
select is((select count(*)::integer from public.bands),0,'password alone grants no band data access');
select is(public.member_pin_login(current_setting('test.leader_member')::uuid,'000000')->>'error','BAD_PIN','wrong member PIN rejected');
select is(private.actor_id(),null::uuid,'wrong PIN cannot select another member');
select is(public.register_band_profile('Leader','drums','223344')->>'error','DUPLICATE_NICKNAME','duplicate active nickname rejected');
select ok((public.register_band_profile('Member','guitar','223344')->>'ok')::boolean,'new member may register after shared-password gate');
select set_config('test.member',(select id::text from public.band_members where user_id=private.actor_id()),true);
select set_config('test.song',public.add_song(current_setting('test.band')::uuid,'Member song','Artist')::text,true);
select throws_ok($$select public.start_round(current_setting('test.band')::uuid)$$,'P0001','FORBIDDEN','member cannot start a round');
select is(public.unlock_band_admin('987654')->>'error','FORBIDDEN','member cannot elevate with leader admin PIN');

-- New device resumes the exact same canonical member, not a duplicate profile.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}',true);
select ok((public.begin_band_access(current_setting('test.code'),'shared-password')->>'ok')::boolean,'second device passes band gate');
select ok((public.member_pin_login(current_setting('test.member')::uuid,'223344')->>'ok')::boolean,'second device resumes existing member with PIN');
select is(private.actor_id(),'10000000-0000-4000-8000-000000000002'::uuid,'second device resolves original member ID');
select lives_ok($$select public.update_song_difficulty(current_setting('test.song')::bigint,'guitar',3::smallint,0)$$,'resumed member may edit song difficulty');
select is((select updated_by from public.song_difficulties where song_id=current_setting('test.song')::bigint),'10000000-0000-4000-8000-000000000002'::uuid,'difficulty editor records the canonical actor, not device ID');
select ok((public.change_member_pin('334455','223344')->>'ok')::boolean,'self PIN change verifies current PIN');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}',true);
select is(private.actor_id(),null::uuid,'PIN change revokes the original device without raw UID fallback');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":true}',true);
select public.begin_band_access(current_setting('test.code'),'shared-password');
select public.member_pin_login(current_setting('test.leader_member')::uuid,'001234');
select ok(not private.is_band_leader(current_setting('test.band')::uuid),'leader personal PIN does not unlock admin rights');
select throws_ok($$select public.start_round(current_setting('test.band')::uuid)$$,'P0001','FORBIDDEN','leader management blocked until administrator PIN');
select is(public.unlock_band_admin('000000')->>'error','BAD_PIN','wrong administrator PIN rejected');
select ok((public.unlock_band_admin('987654')->>'ok')::boolean,'administrator PIN elevates leader session');
select ok(private.is_band_leader(current_setting('test.band')::uuid),'leader management now enabled');
select set_config('test.round',public.start_round(current_setting('test.band')::uuid)::text,true);
select ok((public.configure_band_login('rotated-password','876543')->>'ok')::boolean,'elevated leader rotates shared credentials');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}',true);
select is(private.actor_id(),null::uuid,'shared-password rotation revokes other devices');
select public.begin_band_access(current_setting('test.code'),'rotated-password');
select public.member_pin_login(current_setting('test.member')::uuid,'334455');
select lives_ok($$select public.cast_vote(current_setting('test.round')::uuid,current_setting('test.song')::bigint,'yes',null)$$,'resumed member votes as the canonical round participant');
select is((select count(*)::integer from public.song_votes where round_id=current_setting('test.round')::uuid and member_id=current_setting('test.member')::uuid),1,'vote belongs to the original member ID');
select is((select count(*)::integer from public.song_votes where round_id=current_setting('test.round')::uuid and member_id=current_setting('test.leader_member')::uuid),0,'member vote does not modify the leader vote');
select lives_ok($select public.save_unavailability(current_setting('test.round')::uuid,'[]'::jsonb,false)$,'mapped member submits their own availability');
select is((select status from public.round_submissions where round_id=current_setting('test.round')::uuid and member_id=current_setting('test.leader_member')::uuid),'pending','member submission leaves leader availability untouched');
select public.end_band_session();
select is(private.actor_id(),null::uuid,'logout revokes device identity immediately');

-- Persistent failure counter: functions return errors rather than rolling the counter back.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated","is_anonymous":true}',true);
select public.begin_band_access(current_setting('test.code'),'rotated-password');
do $$ begin for n in 1..10 loop perform public.member_pin_login(current_setting('test.member')::uuid,'000000'); end loop; end $$;
select is(public.member_pin_login(current_setting('test.member')::uuid,'334455')->>'error','RATE_LIMITED','PIN guesses are throttled across device sessions');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000009',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000009","role":"authenticated","is_anonymous":false}',true);
select is(private.actor_id(),'10000000-0000-4000-8000-000000000009'::uuid,'legacy email identity remains compatible');
select is((select count(*)::integer from public.songs),0,'unrelated email user cannot read another band songs');

select * from finish();
rollback;
