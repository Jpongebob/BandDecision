-- One calendar save must apply additions and removals together, or neither.
begin;
create function public.change_band_availability(p_add date[],p_remove date[]) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id,id into b,m from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 if not exists(select 1 from public.band_members where id=m and band_id=b and user_id=private.actor_id() and status='active') then raise exception 'FORBIDDEN'; end if;
 if p_add is null or p_remove is null or cardinality(p_add)>366 or cardinality(p_remove)>3660
 or exists(select 1 from unnest(p_add||p_remove) d where d is null) then raise exception 'INVALID_INPUT'; end if;
 if cardinality(p_add)<>(select count(distinct d) from unnest(p_add) d)
 or cardinality(p_remove)<>(select count(distinct d) from unnest(p_remove) d)
 or p_add&&p_remove then raise exception 'DUPLICATE_CONFLICT'; end if;
 if cardinality(p_add)>0 then
  perform public.save_band_availability((select jsonb_agg(jsonb_build_object('date',d)) from unnest(p_add) d));
 end if;
 if cardinality(p_remove)>0 then perform public.delete_band_availability_dates(p_remove); end if;
end $$;
revoke all on function public.change_band_availability(date[],date[]) from public,anon,authenticated;
grant execute on function public.change_band_availability(date[],date[]) to authenticated;
notify pgrst,'reload schema';
commit;
