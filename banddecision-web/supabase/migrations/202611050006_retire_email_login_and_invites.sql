-- Retire legacy email onboarding/invites without deleting any band/profile history.
begin;
revoke all on function public.create_band(text,text,text) from public, anon, authenticated;
revoke all on function public.create_invite(uuid) from public, anon, authenticated;
revoke all on function public.inspect_invite(text) from public, anon, authenticated;
revoke all on function public.redeem_invite(text,text) from public, anon, authenticated;
revoke all on table public.band_invites from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
