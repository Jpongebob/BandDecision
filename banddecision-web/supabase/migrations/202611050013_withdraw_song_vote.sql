-- Only the verified member can withdraw their own current band vote.
begin;
create function public.withdraw_band_song_vote(p_song bigint) returns void
language plpgsql security definer set search_path='' as $$
declare b uuid; m uuid;
begin
 select band_id into b from public.band_members where user_id=private.actor_id() and status='active';
 if b is null then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.bands where id=b for update;
 select id into m from public.band_members where band_id=b and user_id=private.actor_id() and status='active';
 if m is null or not exists(select 1 from public.songs where id=p_song and band_id=b) then raise exception 'FORBIDDEN'; end if;
 delete from public.band_song_votes where band_id=b and song_id=p_song and member_id=m;
 -- The existing live_vote_changes trigger advances planning_version only for a real deletion.
end $$;
revoke all on function public.withdraw_band_song_vote(bigint) from public,anon;
grant execute on function public.withdraw_band_song_vote(bigint) to authenticated;
notify pgrst,'reload schema';
commit;
