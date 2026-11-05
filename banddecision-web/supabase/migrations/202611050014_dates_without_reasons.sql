-- Remove unavailability reason data and prevent future storage. Legacy columns remain empty only for old RPC compatibility.
begin;
alter table public.unavailable_dates drop constraint unavailable_dates_reason_check;
update public.unavailable_dates set reason='';
alter table public.unavailable_dates add constraint unavailable_dates_reason_check check(reason='');
update public.confirmed_plan_members set reason_snapshot=null;
alter table public.unavailable_dates alter column reason set default '';
create or replace function public.save_band_unavailability(p_dates jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid; item jsonb; dt date; why text;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if p_dates is null or jsonb_typeof(p_dates)<>'array' then raise exception 'INVALID_INPUT'; end if;
 if jsonb_array_length(p_dates) not between 1 and 366 then raise exception 'INVALID_INPUT'; end if;
 for item in select value from jsonb_array_elements(p_dates) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (item ? 'reason' and jsonb_typeof(item->'reason') is distinct from 'string') then raise exception 'INVALID_INPUT'; end if;
  begin dt:=(item->>'date')::date; exception when others then raise exception 'INVALID_INPUT'; end;
  why:=btrim(coalesce(item->>'reason',''));
  if dt<(now() at time zone 'Asia/Seoul')::date or char_length(why)>200 then raise exception 'INVALID_INPUT'; end if;
  if exists(select 1 from public.unavailable_dates where member_id=m and unavailable_date=dt and band_id=b) then raise exception 'DATE_ALREADY_SAVED'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_dates) e group by e->>'date' having count(*)>1) then raise exception 'DUPLICATE_CONFLICT'; end if;
 insert into public.unavailable_dates(band_id,member_id,unavailable_date,reason) select b,m,(e->>'date')::date,btrim(coalesce(e->>'reason','')) from jsonb_array_elements(p_dates) e;
end $$;
create or replace function public.update_band_unavailability(p_date date,p_new_date date,p_reason text default null) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if p_date is null or p_new_date is null or (p_reason is not null and char_length(btrim(p_reason))>200) or (p_new_date<>p_date and p_new_date<(now() at time zone 'Asia/Seoul')::date) then raise exception 'INVALID_INPUT'; end if;
 if p_new_date<>p_date and exists(select 1 from public.unavailable_dates where band_id=b and member_id=m and unavailable_date=p_new_date) then raise exception 'DATE_ALREADY_SAVED'; end if;
 update public.unavailable_dates set unavailable_date=p_new_date,reason=coalesce(btrim(p_reason),reason),updated_at=now() where band_id=b and member_id=m and unavailable_date=p_date;
 if not found then raise exception 'DATE_NOT_FOUND'; end if;
end $$;

create function private.discard_unavailability_reason() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='unavailable_dates' then new.reason:=''; else new.reason_snapshot:=null; end if;
 return new;
end $$;
revoke all on function private.discard_unavailability_reason() from public,anon,authenticated;
create trigger discard_date_reason before insert or update on public.unavailable_dates for each row execute function private.discard_unavailability_reason();
create trigger discard_plan_absence_reason before insert or update on public.confirmed_plan_members for each row execute function private.discard_unavailability_reason();
alter table public.confirmed_plan_members add constraint no_absence_reason_snapshot check(reason_snapshot is null);
notify pgrst,'reload schema';
commit;
