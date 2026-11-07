begin;
select plan(65);
insert into auth.users(id,is_anonymous) values('f8000000-0000-4000-8000-000000000001',true),('f8000000-0000-4000-8000-000000000002',true),('f8000000-0000-4000-8000-000000000003',true);
select ok(not has_function_privilege('anon','public.set_plan_attendance(uuid,integer,uuid[])','execute'),'anonymous role cannot set attendance');
select ok(not has_function_privilege('anon','public.update_band_song(bigint,text,text)','execute'),'anonymous role cannot edit songs');
select ok(not has_function_privilege('anon','public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean,text,text,time,time)','execute'),'anonymous role cannot save timed plans');
select ok(not has_function_privilege('authenticated','private.assert_dates_unlocked(uuid,date[])','execute'),'lock helper is internal');
set local role authenticated;
select set_config('qa.p2.day',(now() at time zone 'Asia/Seoul')::date::text,true);
-- Leader, Member and a third member who has not entered any dates yet.
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select public.create_code_band('Phase two','Leader','기타','1234','112233');
select set_config('qa.p2.band',public.current_band_identity()->>'band_id',true);
select set_config('qa.p2.leader',public.current_band_identity()->'member'->>'id',true);
select set_config('qa.p2.code',public.band_login_settings()->>'code',true);
select public.change_band_availability(array[current_setting('qa.p2.day')::date+1,current_setting('qa.p2.day')::date+2],'{}');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000002',true);
select public.begin_band_access(current_setting('qa.p2.code'),'1234');select public.register_band_profile('Member','베이스','246810');
select set_config('qa.p2.member',public.current_band_identity()->'member'->>'id',true);
select public.change_band_availability(array[current_setting('qa.p2.day')::date+1,current_setting('qa.p2.day')::date+2],'{}');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000003',true);
select public.begin_band_access(current_setting('qa.p2.code'),'1234');select public.register_band_profile('Third','드럼','135790');
select set_config('qa.p2.third',public.current_band_identity()->'member'->>'id',true);

-- Timed plan (11 arguments).
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.save_rehearsal_plan(current_setting('qa.p2.band')::uuid,current_setting('qa.p2.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.p2.band')::uuid),null,null,true,null,null,'20:00','20:00')$$,'P0001','INVALID_INPUT','same start and end rejected');
select throws_ok($$select public.save_rehearsal_plan(current_setting('qa.p2.band')::uuid,current_setting('qa.p2.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.p2.band')::uuid),null,null,true,null,null,null,'21:00')$$,'P0001','INVALID_INPUT','missing start rejected');
select set_config('qa.p2.plan',public.save_rehearsal_plan(current_setting('qa.p2.band')::uuid,current_setting('qa.p2.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.p2.band')::uuid),null,null,true,'Room A',null,'19:00','21:30')::text,true);
select is((select starts_at::text||'-'||ends_at::text from public.confirmed_plans where id=current_setting('qa.p2.plan')::uuid),'19:00:00-21:30:00','new plan stores chosen times');
select is((select attendee_count||'/'||participant_count from public.confirmed_plans where id=current_setting('qa.p2.plan')::uuid),'2/3','plan counts members who entered the day');
select lives_ok($$select public.save_rehearsal_plan(current_setting('qa.p2.band')::uuid,current_setting('qa.p2.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.p2.band')::uuid),current_setting('qa.p2.plan')::uuid,1,true,'Room A',null,'22:00','00:30')$$,'end after midnight accepted');
select is((select starts_at::text||'-'||ends_at::text||'/v'||version from public.confirmed_plans where id=current_setting('qa.p2.plan')::uuid),'22:00:00-00:30:00/v2','edit stores new times and version');
select lives_ok($$select public.save_rehearsal_plan(current_setting('qa.p2.band')::uuid,current_setting('qa.p2.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.p2.band')::uuid),current_setting('qa.p2.plan')::uuid,2,true,'Room B',null)$$,'previous 9-argument save still works');
select is((select starts_at::text||'-'||ends_at::text||'/'||location from public.confirmed_plans where id=current_setting('qa.p2.plan')::uuid),'22:00:00-00:30:00/Room B','previous save keeps the chosen times');

-- Members cannot change a confirmed day themselves.
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.change_band_availability('{}',array[current_setting('qa.p2.day')::date+1])$$,'P0001','DATE_LOCKED','member cannot remove a confirmed day');
select throws_ok($$select public.change_band_availability(array[current_setting('qa.p2.day')::date+3],array[current_setting('qa.p2.day')::date+1])$$,'P0001','DATE_LOCKED','locked removal also blocks the addition in the same save');
select ok(not exists(select 1 from public.available_dates where member_id=current_setting('qa.p2.member')::uuid and available_date=current_setting('qa.p2.day')::date+3),'blocked save adds nothing');
select throws_ok($$select public.delete_band_availability_dates(array[current_setting('qa.p2.day')::date+1,current_setting('qa.p2.day')::date+2])$$,'P0001','DATE_LOCKED','bulk removal including a confirmed day blocked');
select ok(exists(select 1 from public.available_dates where member_id=current_setting('qa.p2.member')::uuid and available_date=current_setting('qa.p2.day')::date+2),'blocked bulk removal keeps other days');
select throws_ok($$select public.delete_band_availability(current_setting('qa.p2.day')::date+1)$$,'P0001','DATE_LOCKED','single removal blocked');
select throws_ok($$select public.update_band_availability(current_setting('qa.p2.day')::date+1,current_setting('qa.p2.day')::date+3)$$,'P0001','DATE_LOCKED','moving away from a confirmed day blocked');
select throws_ok($$select public.update_band_availability(current_setting('qa.p2.day')::date+2,current_setting('qa.p2.day')::date+1)$$,'P0001','DATE_LOCKED','moving onto a confirmed day blocked');
select lives_ok($$select public.change_band_availability('{}',array[current_setting('qa.p2.day')::date+2])$$,'other days still change');
select lives_ok($$select public.change_band_availability(array[current_setting('qa.p2.day')::date+2],'{}')$$,'other days can be added back');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.change_band_availability(array[current_setting('qa.p2.day')::date+1],'{}')$$,'P0001','DATE_LOCKED','member cannot add a confirmed day');
select throws_ok($$select public.save_band_availability(jsonb_build_array(jsonb_build_object('date',current_setting('qa.p2.day')::date+1)))$$,'P0001','DATE_LOCKED','older add function blocked too');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.change_band_availability('{}',array[current_setting('qa.p2.day')::date+1])$$,'P0001','DATE_LOCKED','leader uses attendance, not the calendar');

-- Leader sets attendance.
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.set_plan_attendance(current_setting('qa.p2.plan')::uuid,3,array[current_setting('qa.p2.member')::uuid])$$,'P0001','FORBIDDEN','member cannot set attendance');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.set_plan_attendance(current_setting('qa.p2.plan')::uuid,2,array[current_setting('qa.p2.leader')::uuid])$$,'P0001','PLAN_STALE','stale plan version rejected');
select throws_ok($$select public.set_plan_attendance(current_setting('qa.p2.plan')::uuid,3,'{}')$$,'P0001','NO_ATTENDEES','nobody attending rejected');
select throws_ok($$select public.set_plan_attendance(current_setting('qa.p2.plan')::uuid,3,null)$$,'P0001','INVALID_INPUT','null list rejected');
select throws_ok($$select public.set_plan_attendance(current_setting('qa.p2.plan')::uuid,3,array[current_setting('qa.p2.leader')::uuid,current_setting('qa.p2.leader')::uuid])$$,'P0001','INVALID_INPUT','duplicate member rejected');
select throws_ok($$select public.set_plan_attendance(current_setting('qa.p2.plan')::uuid,3,array['00000000-0000-4000-8000-000000000000'::uuid])$$,'P0001','INVALID_INPUT','unknown member rejected');
select throws_ok($$select public.set_plan_attendance('00000000-0000-4000-8000-000000000000',1,array[current_setting('qa.p2.leader')::uuid])$$,'P0001','PLAN_NOT_FOUND','unknown plan rejected');
select lives_ok($$select public.set_plan_attendance(current_setting('qa.p2.plan')::uuid,3,array[current_setting('qa.p2.leader')::uuid,current_setting('qa.p2.third')::uuid])$$,'leader swaps member and third');
select is((select attendee_count||'/'||participant_count||'/v'||version from public.confirmed_plans where id=current_setting('qa.p2.plan')::uuid),'2/3/v4','counts and version updated');
select is((select string_agg(nickname_snapshot||':'||attending,',' order by nickname_snapshot) from public.confirmed_plan_members where plan_id=current_setting('qa.p2.plan')::uuid),'Leader:true,Member:false,Third:true','attendee snapshot updated');
select ok(not exists(select 1 from public.available_dates where member_id=current_setting('qa.p2.member')::uuid and available_date=current_setting('qa.p2.day')::date+1),'absent member day removed so the calendar agrees');
select ok(exists(select 1 from public.available_dates where member_id=current_setting('qa.p2.third')::uuid and available_date=current_setting('qa.p2.day')::date+1),'present member day added so the calendar agrees');
select ok(exists(select 1 from public.available_dates where member_id=current_setting('qa.p2.member')::uuid and available_date=current_setting('qa.p2.day')::date+2),'other days of the absent member kept');
select lives_ok($$select public.save_rehearsal_plan(current_setting('qa.p2.band')::uuid,current_setting('qa.p2.day')::date+1,'{}',(select planning_version from public.bands where id=current_setting('qa.p2.band')::uuid),current_setting('qa.p2.plan')::uuid,4,true,'Room C',null,'22:00','00:30')$$,'later plan edit still saves');
select is((select string_agg(nickname_snapshot||':'||attending,',' order by nickname_snapshot) from public.confirmed_plan_members where plan_id=current_setting('qa.p2.plan')::uuid),'Leader:true,Member:false,Third:true','later plan edit keeps the leader''s attendance');
reset role;
insert into public.confirmed_plans(id,band_id,rehearsal_date,participant_count,attendee_count,confirmed_by) values('f8000000-0000-4000-8000-0000000000aa',current_setting('qa.p2.band')::uuid,current_setting('qa.p2.day')::date-3,3,1,'f8000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$select public.set_plan_attendance('f8000000-0000-4000-8000-0000000000aa',1,array[current_setting('qa.p2.leader')::uuid])$$,'P0001','DATE_OUT_OF_RANGE','past plan attendance cannot change');

-- Optional reason for 반대.
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000003',true);
select set_config('qa.p2.song',public.add_song(current_setting('qa.p2.band')::uuid,'First title','First artist')::text,true);
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.vote_band_song(current_setting('qa.p2.song')::bigint,'no',null)$$,'no without reason accepted');
select ok((select reason is null from public.band_song_votes where song_id=current_setting('qa.p2.song')::bigint and member_id=current_setting('qa.p2.member')::uuid),'missing reason stored as null');
select lives_ok($$select public.vote_band_song(current_setting('qa.p2.song')::bigint,'no','   ')$$,'blank reason accepted');
select ok((select choice='no' and reason is null from public.band_song_votes where song_id=current_setting('qa.p2.song')::bigint and member_id=current_setting('qa.p2.member')::uuid),'blank reason stored as null');
select throws_ok($$select public.vote_band_song(current_setting('qa.p2.song')::bigint,'no',repeat('가',301))$$,'P0001','INVALID_INPUT','reason over 300 characters rejected');
select lives_ok($$select public.vote_band_song(current_setting('qa.p2.song')::bigint,'no','  키가 높아요 ')$$,'reason still saved when given');
select is((select reason from public.band_song_votes where song_id=current_setting('qa.p2.song')::bigint and member_id=current_setting('qa.p2.member')::uuid),'키가 높아요','reason trimmed');
reset role;
select is((select count(*)::int from pg_constraint where conrelid='public.band_song_votes'::regclass and contype='c' and pg_get_constraintdef(oid) like '%reason%'),1,'one reason rule remains');
select throws_ok($$insert into public.band_song_votes(band_id,song_id,member_id,choice,reason) values(current_setting('qa.p2.band')::uuid,current_setting('qa.p2.song')::bigint,current_setting('qa.p2.leader')::uuid,'yes','reason')$$,'23514',null,'yes with reason still rejected by the table');
set local role authenticated;

-- Song edits: uploader and leader only, votes kept, '수정됨' timestamp.
select throws_ok($$select public.update_band_song(current_setting('qa.p2.song')::bigint,'Hijack','X')$$,'P0001','FORBIDDEN','other member cannot edit');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.update_band_song(current_setting('qa.p2.song')::bigint,'  ','Artist')$$,'P0001','INVALID_INPUT','blank title rejected');
select is(public.update_band_song(current_setting('qa.p2.song')::bigint,' Fixed title ','First artist'),true,'uploader edits title');
select is((select title||'/'||(edited_at is not null)::text from public.songs where id=current_setting('qa.p2.song')::bigint),'Fixed title/true','title trimmed and edit time recorded');
select is(public.update_band_song(current_setting('qa.p2.song')::bigint,'Fixed title','First artist'),false,'unchanged edit reports no change');
select is((select count(*)::int from public.band_song_votes where song_id=current_setting('qa.p2.song')::bigint),1,'votes kept after edit');
select is((public.band_song_context(current_setting('qa.p2.song')::bigint)->'songs'->0->>'createdByNickname'),'Third','song context names the uploader');
select ok((public.band_song_context(current_setting('qa.p2.song')::bigint)->'songs'->0->>'editedAt') is not null,'song context shows the edit time');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000001',true);
select is(public.update_band_song(current_setting('qa.p2.song')::bigint,'Leader title','First artist'),true,'leader edits any song');

-- Deletion: uploader only before other members vote and before confirmation; leader always.
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.delete_band_song(current_setting('qa.p2.song')::bigint)$$,'P0001','SONG_HAS_VOTES','uploader cannot delete after another vote');
select set_config('qa.p2.own',public.add_song(current_setting('qa.p2.band')::uuid,'Own vote only','A')::text,true);
select public.vote_band_song(current_setting('qa.p2.own')::bigint,'yes');
select lives_ok($$select public.delete_band_song(current_setting('qa.p2.own')::bigint)$$,'uploader deletes with only their own vote');
select set_config('qa.p2.confirmed',public.add_song(current_setting('qa.p2.band')::uuid,'Leader pick','A')::text,true);
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.delete_band_song(current_setting('qa.p2.confirmed')::bigint)$$,'P0001','FORBIDDEN','other member cannot delete');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000001',true);
select public.set_song_confirmation(current_setting('qa.p2.confirmed')::bigint,true);
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.delete_band_song(current_setting('qa.p2.confirmed')::bigint)$$,'P0001','SONG_CONFIRMED','uploader cannot delete a confirmed song');
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.delete_band_song(current_setting('qa.p2.song')::bigint)$$,'leader deletes a voted song');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
select throws_ok($$select public.set_plan_attendance(current_setting('qa.p2.plan')::uuid,5,array[current_setting('qa.p2.leader')::uuid])$$,'P0001','FORBIDDEN','unmapped session denied');
select * from finish();rollback;
