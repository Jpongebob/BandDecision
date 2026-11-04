alter table public.song_difficulties
  add column version integer not null default 1 check (version > 0),
  add column updated_by uuid references public.profiles(id) on delete set null,
  add column updated_at timestamptz not null default now();

drop policy if exists songs_member_insert on public.songs;
create policy songs_member_insert on public.songs
  for insert to authenticated
  with check (created_by = (select auth.uid()) and private.is_band_member(band_id));

drop policy if exists difficulties_member_insert on public.song_difficulties;
create policy difficulties_member_insert on public.song_difficulties
  for insert to authenticated
  with check (exists (
    select 1 from public.songs s
    where s.id = song_id and private.is_band_member(s.band_id)
  ) and updated_by = (select auth.uid()));

drop policy if exists difficulties_member_update on public.song_difficulties;
create policy difficulties_member_update on public.song_difficulties
  for update to authenticated
  using (exists (
    select 1 from public.songs s
    where s.id = song_id and private.is_band_member(s.band_id)
  ))
  with check (exists (
    select 1 from public.songs s
    where s.id = song_id and private.is_band_member(s.band_id)
  ) and updated_by = (select auth.uid()));

create or replace function public.add_song(p_band uuid, p_title text, p_artist text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  song_id bigint;
begin
  if actor is null then raise exception 'UNAUTHENTICATED'; end if;
  if not private.is_band_member(p_band) then raise exception 'FORBIDDEN'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 120
     or char_length(btrim(coalesce(p_artist, ''))) not between 1 and 120 then
    raise exception 'INVALID_INPUT';
  end if;
  perform 1 from public.planning_rounds
    where band_id = p_band and status in ('collecting', 'ready') for update;
  insert into public.songs(band_id, title, artist, created_by)
    values (p_band, btrim(p_title), btrim(p_artist), actor)
    returning id into song_id;
  update public.planning_rounds set version = version + 1
    where band_id = p_band and status in ('collecting', 'ready');
  return song_id;
end;
$$;

revoke all on function public.update_song_difficulty(bigint, text, smallint) from public, anon, authenticated;
drop function public.update_song_difficulty(bigint, text, smallint);

create function public.update_song_difficulty(
  p_song bigint,
  p_part text,
  p_difficulty smallint,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  band uuid;
  current_version integer;
  saved_version integer;
begin
  if actor is null then raise exception 'UNAUTHENTICATED'; end if;
  select s.band_id into band from public.songs s where s.id = p_song for update;
  if not found then raise exception 'SONG_NOT_FOUND'; end if;
  if not private.is_band_member(band) then raise exception 'FORBIDDEN'; end if;
  if char_length(btrim(coalesce(p_part, ''))) not between 1 and 30
     or p_difficulty is null
     or p_difficulty not between 1 and 5
     or p_expected_version is null or p_expected_version < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_song::text || ':' || lower(btrim(p_part)), 0));
  select d.version into current_version
    from public.song_difficulties d
    where d.song_id = p_song and d.part_key = lower(btrim(p_part))
    for update;

  if not found then
    if p_expected_version <> 0 then raise exception 'DIFFICULTY_STALE'; end if;
    insert into public.song_difficulties(song_id, part_key, difficulty, version, updated_by, updated_at)
      values (p_song, lower(btrim(p_part)), p_difficulty, 1, actor, now())
      returning version into saved_version;
  else
    if p_expected_version <> current_version then raise exception 'DIFFICULTY_STALE'; end if;
    update public.song_difficulties
      set difficulty = p_difficulty,
          version = version + 1,
          updated_by = actor,
          updated_at = now()
      where song_id = p_song and part_key = lower(btrim(p_part))
      returning version into saved_version;
  end if;

  perform 1 from public.planning_rounds
    where band_id = band and status in ('collecting', 'ready') for update;
  update public.planning_rounds set version = version + 1
    where band_id = band and status in ('collecting', 'ready');
  return saved_version;
end;
$$;

revoke all on function public.add_song(uuid, text, text) from public, anon;
revoke all on function public.update_song_difficulty(bigint, text, smallint, integer) from public, anon;
grant execute on function public.add_song(uuid, text, text) to authenticated;
grant execute on function public.update_song_difficulty(bigint, text, smallint, integer) to authenticated;
