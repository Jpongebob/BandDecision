-- Continuous planning: current active members, persistent availability/votes, editable date-only plans.
-- Retain historical round tables and confirmed snapshots; the application no longer uses rounds.
begin;
alter table public.bands add column planning_version bigint not null default 0 check(planning_version>=0);
alter table public.confirmed_plans alter column round_id drop not null;
alter table public.confirmed_plans add column version integer not null default 1 check(version>0);
create table public.band_song_votes (
 band_id uuid not null references public.bands(id) on delete cascade,
 song_id bigint not null, member_id uuid not null, choice text not null check(choice in ('yes','no')),
 reason text, updated_at timestamptz not null default now(), primary key(song_id,member_id),
 foreign key(song_id,band_id) references public.songs(id,band_id) on delete cascade,
 foreign key(member_id,band_id) references public.band_members(id,band_id) on delete cascade,
 check((choice='yes' and reason is null) or (choice='no' and char_length(btrim(coalesce(reason,''))) between 1 and 300))
);
alter table public.band_song_votes enable row level security;
revoke all on public.band_song_votes from public,anon,authenticated;
grant select on public.band_song_votes to authenticated;
create policy live_votes_band_read on public.band_song_votes for select to authenticated using(private.is_band_member(band_id));
insert into public.band_song_votes(band_id,song_id,member_id,choice,reason,updated_at)
 select distinct on(v.song_id,v.member_id) s.band_id,v.song_id,v.member_id,v.choice,v.reason,v.updated_at
 from public.song_votes v join public.songs s on s.id=v.song_id
 join public.band_members m on m.id=v.member_id and m.band_id=s.band_id
 join public.planning_rounds r on r.id=v.round_id and r.band_id=s.band_id
 order by v.song_id,v.member_id,v.updated_at desc,r.created_at desc,r.id;

create function private.bump_band_planning() returns trigger
language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
 if tg_table_name='song_difficulties' then
  select band_id into b from public.songs where id=coalesce(new.song_id,old.song_id);
 elsif tg_table_name='profiles' then
  select band_id into b from public.band_members where user_id=coalesce(new.id,old.id) and status='active';
 else b:=coalesce(new.band_id,old.band_id); end if;
 update public.bands set planning_version=planning_version+1 where id=b;
 return null;
end $$;
revoke all on function private.bump_band_planning() from public,anon,authenticated;
create trigger live_member_changes after insert or update or delete on public.band_members for each row execute function private.bump_band_planning();
create trigger live_song_changes after insert or update or delete on public.songs for each row execute function private.bump_band_planning();
create trigger live_difficulty_changes after insert or update or delete on public.song_difficulties for each row execute function private.bump_band_planning();
create trigger live_date_changes after insert or update or delete on public.unavailable_dates for each row execute function private.bump_band_planning();
create trigger live_vote_changes after insert or update or delete on public.band_song_votes for each row execute function private.bump_band_planning();
create trigger live_nickname_changes after update of nickname on public.profiles for each row execute function private.bump_band_planning();
-- Internal sample-fixture compatibility. Browser/API callers cannot use the retired round RPCs.
create function private.sync_historical_vote() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.band_song_votes(band_id,song_id,member_id,choice,reason,updated_at)
 select s.band_id,new.song_id,new.member_id,new.choice,new.reason,new.updated_at from public.songs s
 join public.band_members m on m.id=new.member_id and m.band_id=s.band_id where s.id=new.song_id
 on conflict(song_id,member_id) do update set choice=excluded.choice,reason=excluded.reason,updated_at=excluded.updated_at;
 return null;
end $$;
revoke all on function private.sync_historical_vote() from public,anon,authenticated;
create trigger historical_vote_compat after insert or update on public.song_votes for each row execute function private.sync_historical_vote();

create function public.band_planning_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid; me uuid; result jsonb;
begin
 select band_id,id into b,me from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then return null; end if;
 select jsonb_build_object('band_id',b,'version',bands.planning_version,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'nickname',p.nickname,'part',m.part_label,'partKey',m.part_key,'skill',m.skill) order by m.joined_at,m.id) from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=b and m.status='active'),'[]'::jsonb),
  'unavailable',coalesce((select jsonb_agg(jsonb_build_object('memberId',d.member_id,'date',d.unavailable_date,'reason',d.reason) order by d.unavailable_date,d.member_id) from public.unavailable_dates d join public.band_members m on m.id=d.member_id and m.status='active' where d.band_id=b),'[]'::jsonb),
  'songs',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'artist',s.artist,
   'difficulties',coalesce((select jsonb_object_agg(d.part_key,d.difficulty) from public.song_difficulties d where d.song_id=s.id),'{}'::jsonb),
   'difficultyMeta',coalesce((select jsonb_object_agg(d.part_key,jsonb_build_object('version',d.version,'updatedAt',d.updated_at,'updatedBy',p.nickname)) from public.song_difficulties d left join public.profiles p on p.id=d.updated_by where d.song_id=s.id),'{}'::jsonb),
   'votes',coalesce((select jsonb_agg(jsonb_build_object('memberId',v.member_id,'choice',v.choice,'reason',v.reason)) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=s.id),'[]'::jsonb)
  ) order by s.id) from public.songs s where s.band_id=b),'[]'::jsonb)) into result from public.bands bands where bands.id=b;
 return result;
end $$;

create function public.save_band_unavailability(p_dates jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid; item jsonb; dt date; why text;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if p_dates is null or jsonb_typeof(p_dates)<>'array' then raise exception 'INVALID_INPUT'; end if;
 if jsonb_array_length(p_dates) not between 1 and 366 then raise exception 'INVALID_INPUT'; end if;
 for item in select value from jsonb_array_elements(p_dates) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or jsonb_typeof(item->'reason') is distinct from 'string' then raise exception 'INVALID_INPUT'; end if;
  begin dt:=(item->>'date')::date; exception when others then raise exception 'INVALID_INPUT'; end;
  why:=btrim(item->>'reason');
  if dt<(now() at time zone 'Asia/Seoul')::date or char_length(why) not between 1 and 200 then raise exception 'INVALID_INPUT'; end if;
  if exists(select 1 from public.unavailable_dates where member_id=m and unavailable_date=dt and band_id=b) then raise exception 'DATE_ALREADY_SAVED'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_dates) e group by e->>'date' having count(*)>1) then raise exception 'DUPLICATE_CONFLICT'; end if;
 insert into public.unavailable_dates(band_id,member_id,unavailable_date,reason) select b,m,(e->>'date')::date,btrim(e->>'reason') from jsonb_array_elements(p_dates) e;
end $$;
create function public.update_band_unavailability(p_date date,p_new_date date,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if p_date is null or p_new_date is null or p_reason is null or char_length(btrim(p_reason)) not between 1 and 200 or (p_new_date<>p_date and p_new_date<(now() at time zone 'Asia/Seoul')::date) then raise exception 'INVALID_INPUT'; end if;
 if p_new_date<>p_date and exists(select 1 from public.unavailable_dates where band_id=b and member_id=m and unavailable_date=p_new_date) then raise exception 'DATE_ALREADY_SAVED'; end if;
 update public.unavailable_dates set unavailable_date=p_new_date,reason=btrim(p_reason),updated_at=now() where band_id=b and member_id=m and unavailable_date=p_date;
 if not found then raise exception 'DATE_NOT_FOUND'; end if;
end $$;
create function public.delete_band_unavailability(p_date date) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 delete from public.unavailable_dates where band_id=b and member_id=m and unavailable_date=p_date;
 if not found then raise exception 'DATE_NOT_FOUND'; end if;
end $$;
create function public.vote_band_song(p_song bigint,p_choice text,p_reason text default null) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.songs where id=p_song and band_id=b) then raise exception 'FORBIDDEN'; end if;
 if p_choice is null or p_choice not in ('yes','no') or (p_choice='no' and char_length(btrim(coalesce(p_reason,''))) not between 1 and 300) then raise exception 'INVALID_INPUT'; end if;
 insert into public.band_song_votes(band_id,song_id,member_id,choice,reason) values(b,p_song,m,p_choice,case when p_choice='no' then btrim(p_reason) else null end)
 on conflict(song_id,member_id) do update set choice=excluded.choice,reason=excluded.reason,updated_at=now();
end $$;

create function public.save_rehearsal_plan(p_band uuid,p_date date,p_song_ids bigint[],p_expected_version bigint,p_plan uuid,p_expected_plan_version integer,p_ack_partial boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare v bigint; old_plan public.confirmed_plans%rowtype; saved_songs jsonb:='[]'; n int; attend int; song bigint; plan uuid; snapshot jsonb;
begin
 perform 1 from public.bands where id=p_band for update;
 if not found or not private.is_band_leader(p_band) then raise exception 'FORBIDDEN'; end if;
 select planning_version into v from public.bands where id=p_band;
 if p_expected_version is null or v<>p_expected_version then raise exception 'PLANNING_STALE'; end if;
 if p_plan is not null then
  select * into old_plan from public.confirmed_plans where id=p_plan and band_id=p_band for update;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  if p_expected_plan_version is null or old_plan.version<>p_expected_plan_version then raise exception 'PLAN_STALE'; end if;
  select coalesce(jsonb_agg(to_jsonb(s)),'[]') into saved_songs from public.confirmed_plan_songs s where plan_id=p_plan;
 elsif (select count(*) from public.confirmed_plans where band_id=p_band)>=5 then raise exception 'PLAN_LIMIT_REACHED'; end if;
 if p_date is null or (p_date<(now() at time zone 'Asia/Seoul')::date and (p_plan is null or p_date is distinct from old_plan.rehearsal_date)) then raise exception 'DATE_OUT_OF_RANGE'; end if;
 if p_song_ids is null or cardinality(p_song_ids)<>(select count(distinct x) from unnest(p_song_ids) x) or exists(select 1 from unnest(p_song_ids) x where x is null or x<1) then raise exception 'INVALID_INPUT'; end if;
 select count(*) into n from public.band_members where band_id=p_band and status='active';
 if n=0 then raise exception 'NO_MEMBERS'; end if;
 select count(*) into attend from public.band_members m where m.band_id=p_band and m.status='active' and not exists(select 1 from public.unavailable_dates d where d.member_id=m.id and d.band_id=p_band and d.unavailable_date=p_date);
 if attend=0 then raise exception 'NO_ATTENDEES'; end if;
 if attend<n and not coalesce(p_ack_partial,false) then raise exception 'PARTIAL_ACK_REQUIRED'; end if;
 foreach song in array p_song_ids loop
  if exists(select 1 from jsonb_array_elements(saved_songs) s where (s->>'source_song_id')::bigint=song) then continue; end if;
  if not exists(select 1 from public.songs where id=song and band_id=p_band)
   or (select count(*) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=song and v.band_id=p_band)<>n
   or (select count(*) from public.band_song_votes v join public.band_members m on m.id=v.member_id and m.status='active' where v.song_id=song and v.band_id=p_band and v.choice='yes')<(2*n+2)/3
   or exists(select 1 from public.band_members m where m.band_id=p_band and m.status='active' and not exists(select 1 from public.song_difficulties d where d.song_id=song and d.part_key=m.part_key)) then raise exception 'SONG_NOT_ELIGIBLE'; end if;
 end loop;
 if p_plan is null then
  insert into public.confirmed_plans(band_id,rehearsal_date,participant_count,attendee_count,confirmed_by) values(p_band,p_date,n,attend,private.actor_id()) returning id into plan;
 else
  plan:=p_plan;
  update public.confirmed_plans set rehearsal_date=p_date,participant_count=n,attendee_count=attend,confirmed_by=private.actor_id(),confirmed_at=now(),version=version+1 where id=plan;
  delete from public.confirmed_plan_members where plan_id=plan;
  delete from public.confirmed_plan_songs where plan_id=plan;
 end if;
 insert into public.confirmed_plan_members(plan_id,source_member_id,nickname_snapshot,part_snapshot,attending,reason_snapshot)
 select plan,m.id,p.nickname,m.part_label,not exists(select 1 from public.unavailable_dates d where d.member_id=m.id and d.band_id=p_band and d.unavailable_date=p_date),(select reason from public.unavailable_dates d where d.member_id=m.id and d.band_id=p_band and d.unavailable_date=p_date)
 from public.band_members m join public.profiles p on p.id=m.user_id where m.band_id=p_band and m.status='active';
 for song in 1..cardinality(p_song_ids) loop
  select s into snapshot from jsonb_array_elements(saved_songs) s where (s->>'source_song_id')::bigint=p_song_ids[song];
  if found then
   insert into public.confirmed_plan_songs(plan_id,source_song_id,title_snapshot,artist_snapshot,display_order) values(plan,p_song_ids[song],snapshot->>'title_snapshot',snapshot->>'artist_snapshot',song);
  else
   insert into public.confirmed_plan_songs(plan_id,source_song_id,title_snapshot,artist_snapshot,display_order) select plan,id,title,artist,song from public.songs where id=p_song_ids[song];
  end if;
 end loop;
 update public.bands set planning_version=planning_version+1 where id=p_band;
 return plan;
end $$;
create function public.delete_live_plan(p_plan uuid,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; v integer;
begin
 select band_id into b from public.confirmed_plans where id=p_plan;
 if not found then raise exception 'PLAN_NOT_FOUND'; end if;
 perform 1 from public.bands where id=b for update;
 if not private.is_band_leader(b) then raise exception 'FORBIDDEN'; end if;
 select version into v from public.confirmed_plans where id=p_plan for update;
 if not found then raise exception 'PLAN_NOT_FOUND'; end if;
 if p_expected_version is null or v<>p_expected_version then raise exception 'PLAN_STALE'; end if;
 delete from public.confirmed_plans where id=p_plan;
 update public.bands set planning_version=planning_version+1 where id=b;
end $$;
revoke all on function public.band_planning_context(),public.save_band_unavailability(jsonb),public.update_band_unavailability(date,date,text),public.delete_band_unavailability(date),public.vote_band_song(bigint,text,text),public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean),public.delete_live_plan(uuid,integer) from public,anon;
grant execute on function public.band_planning_context(),public.save_band_unavailability(jsonb),public.update_band_unavailability(date,date,text),public.delete_band_unavailability(date),public.vote_band_song(bigint,text,text),public.save_rehearsal_plan(uuid,date,bigint[],bigint,uuid,integer,boolean),public.delete_live_plan(uuid,integer) to authenticated;
revoke all on function public.start_round(uuid),public.save_unavailability(uuid,jsonb,boolean),public.cast_vote(uuid,bigint,text,text),public.confirm_rehearsal_plan(uuid,date,bigint[],bigint,boolean),public.delete_rehearsal_plan(uuid) from public,anon,authenticated;
do $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables) then alter publication supabase_realtime add table public.band_song_votes; end if; end $$;
notify pgrst,'reload schema';
commit;
