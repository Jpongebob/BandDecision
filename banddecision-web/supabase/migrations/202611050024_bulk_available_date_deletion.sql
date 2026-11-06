-- Delete only the authenticated member's selected available dates.
begin;
create function public.delete_band_availability_dates(p_dates date[]) returns integer
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid; removed integer;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.band_members where id=m and band_id=b and status='active' and user_id=private.actor_id()) then raise exception 'FORBIDDEN'; end if;
 if p_dates is null or cardinality(p_dates) not between 1 and 3660
    or exists(select 1 from unnest(p_dates) d where d is null) then raise exception 'INVALID_INPUT'; end if;
 if cardinality(p_dates)<>(select count(distinct d) from unnest(p_dates) d) then raise exception 'DUPLICATE_CONFLICT'; end if;
 delete from public.available_dates where band_id=b and member_id=m and available_date=any(p_dates);
 get diagnostics removed=row_count;
 return removed;
end $$;
revoke all on function public.delete_band_availability_dates(date[]) from public,anon,authenticated;
grant execute on function public.delete_band_availability_dates(date[]) to authenticated;
notify pgrst,'reload schema';
commit;
