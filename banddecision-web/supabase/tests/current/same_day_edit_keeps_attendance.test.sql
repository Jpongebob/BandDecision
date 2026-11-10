begin;
select plan(24);
insert into auth.users(id,is_anonymous) values('f9000000-0000-4000-8000-000000000001',true),('f9000000-0000-4000-8000-000000000002',true),('f9000000-0000-4000-8000-000000000003',true);
select ok(not has_function_privilege('anon','public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time)','execute'),'anonymous role cannot save plans');
select ok(has_function_privilege('authenticated','public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time)','execute'),'signed-in members can call the save');
select ok(obj_description('public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time)'::regprocedure,'pg_proc') like '028:%','028 marker is on the timed save');
set local role authenticated;
select set_config('qa.s28.day',(now() at time zone 'Asia/Seoul')::date::text,true);
-- Leader and Member can come on day+1. Day+2: Leader and Third. Day+3: Leader only.
select set_config('request.jwt.claim.sub','f9000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select public.create_code_band('Same day','Leader','기타','1234','112233');
select set_config('qa.s28.band',public.current_band_identity()->>'band_id',true);
select set_config('qa.s28.leader',public.current_band_identity()->'member'->>'id',true);
select set_config('qa.s28.code',public.band_login_settings()->>'code',true);
select public.change_band_availability(array[current_setting('qa.s28.day')::date+1,current_setting('qa.s28.day')::date+2,current_setting('qa.s28.day')::date+3],'{}');
select set_config('request.jwt.claim.sub','f9000000-0000-4000-8000-000000000002',true);
select public.begin_band_access(current_setting('qa.s28.code'),'1234');select public.register_band_profile('Member','베이스','246810');
select set_config('qa.s28.member',public.current_band_identity()->'member'->>'id',true);
select public.change_band_availability(array[current_setting('qa.s28.day')::date+1],'{}');
select set_config('request.jwt.claim.sub','f9000000-0000-4000-8000-000000000003',true);
select public.begin_band_access(current_setting('qa.s28.code'),'1234');select public.register_band_profile('Third','드럼','135790');
select set_config('qa.s28.third',public.current_band_identity()->'member'->>'id',true);
select public.change_band_availability(array[current_setting('qa.s28.day')::date+2],'{}');

-- Plan on day+1: Leader and Member attend, Third does not.
select set_config('request.jwt.claim.sub','f9000000-0000-4000-8000-000000000001',true);
select set_config('qa.s28.plan',public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),null,null,true,'Room A','memo','20:00','22:00')::text,true);
select is((select attendee_count||'/'||participant_count||'/v'||version from public.confirmed_plans where id=current_setting('qa.s28.plan')::uuid),'2/3/v1','new plan counts members who entered the day');

-- Before 027 a member could still take the day back; recreate that here as the database owner.
reset role;
delete from public.available_dates where member_id=current_setting('qa.s28.member')::uuid and available_date=current_setting('qa.s28.day')::date+1;
set local role authenticated;

-- Same day: time, place and memo change; attendance stays as saved, and no partial agreement is needed.
select set_config('qa.s28.pv',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid)::text,true);
select lives_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+1,'{}',current_setting('qa.s28.pv')::bigint,current_setting('qa.s28.plan')::uuid,1,false,' Room B ','new memo','19:30','21:30')$$,'same-day edit saves without partial agreement');
select is((select attendee_count||'/'||participant_count||'/v'||version from public.confirmed_plans where id=current_setting('qa.s28.plan')::uuid),'2/3/v2','same-day edit keeps the saved counts and raises the version');
select is((select string_agg(nickname_snapshot||':'||attending,',' order by nickname_snapshot) from public.confirmed_plan_members where plan_id=current_setting('qa.s28.plan')::uuid),'Leader:true,Member:true,Third:false','same-day edit keeps every attendee row');
select is((select location||'/'||memo||'/'||starts_at::text||'-'||ends_at::text from public.confirmed_plans where id=current_setting('qa.s28.plan')::uuid),'Room B/new memo/19:30:00-21:30:00','same-day edit stores place, memo and time');
select ok((select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid)>current_setting('qa.s28.pv')::bigint,'same-day edit tells other screens to refresh');
select ok(not exists(select 1 from public.available_dates where member_id=current_setting('qa.s28.member')::uuid and available_date=current_setting('qa.s28.day')::date+1),'same-day edit does not touch anyone''s calendar');
select lives_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),current_setting('qa.s28.plan')::uuid,2,true,'',null,'22:00','00:30')$$,'same-day edit with the agreement flag also saves');
select is((select coalesce(location,'(none)')||'/'||coalesce(memo,'(none)')||'/'||attendee_count||'/v'||version from public.confirmed_plans where id=current_setting('qa.s28.plan')::uuid),'(none)/(none)/2/v3','blank place and memo clear, attendance still kept');

-- Same-day edits still respect the usual checks.
select throws_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),current_setting('qa.s28.plan')::uuid,2,false,null,null,'20:00','22:00')$$,'P0001','PLAN_STALE','old plan version rejected');
select throws_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+1,'{}',0,current_setting('qa.s28.plan')::uuid,3,false,null,null,'20:00','22:00')$$,'P0001','PLANNING_STALE','old band version rejected');
select throws_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),current_setting('qa.s28.plan')::uuid,3,false,null,null,'20:00','20:00')$$,'P0001','INVALID_INPUT','equal times rejected');
select set_config('request.jwt.claim.sub','f9000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),current_setting('qa.s28.plan')::uuid,3,false,null,null,'20:00','22:00')$$,'P0001','FORBIDDEN','members cannot edit plans');
select set_config('request.jwt.claim.sub','f9000000-0000-4000-8000-000000000001',true);

-- Moving to another day works as before: counted from that day, partial agreement required.
select throws_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+2,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),current_setting('qa.s28.plan')::uuid,3,false,null,null,'20:00','22:00')$$,'P0001','PARTIAL_ACK_REQUIRED','moving with someone missing needs agreement');
select lives_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+2,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),current_setting('qa.s28.plan')::uuid,3,true,null,null,'20:00','22:00')$$,'moving with agreement saves');
select is((select rehearsal_date-current_setting('qa.s28.day')::date||'/'||attendee_count||'/'||participant_count||'/v'||version from public.confirmed_plans where id=current_setting('qa.s28.plan')::uuid),'2/2/3/v4','moved plan counts the new day');
select is((select string_agg(nickname_snapshot||':'||attending,',' order by nickname_snapshot) from public.confirmed_plan_members where plan_id=current_setting('qa.s28.plan')::uuid),'Leader:true,Member:false,Third:true','moved plan rebuilds attendees from the new day');

-- After a leader attendance change, a same-day edit keeps the leader's list.
select lives_ok($$select public.set_plan_attendance(current_setting('qa.s28.plan')::uuid,4,array[current_setting('qa.s28.leader')::uuid,current_setting('qa.s28.member')::uuid,current_setting('qa.s28.third')::uuid])$$,'leader marks everyone present');
select lives_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+2,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),current_setting('qa.s28.plan')::uuid,5,false,'Room C',null,'20:00','22:00')$$,'same-day edit after the attendance change saves');
select is((select attendee_count||'/'||participant_count||'/'||location from public.confirmed_plans where id=current_setting('qa.s28.plan')::uuid),'3/3/Room C','leader''s attendance survives the edit');

-- New plans still need agreement when someone cannot come.
select throws_ok($$select public.save_rehearsal_plan(current_setting('qa.s28.band')::uuid,current_setting('qa.s28.day')::date+3,'{}',(select planning_version from public.bands where id=current_setting('qa.s28.band')::uuid),null,null,false,null,null,'20:00','22:00')$$,'P0001','PARTIAL_ACK_REQUIRED','new plan with someone missing needs agreement');
select * from finish();
rollback;
