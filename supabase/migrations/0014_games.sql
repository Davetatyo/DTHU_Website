-- 0014 · Games (R17 Meccs jelentése): one row per real game, the only source for stats now and
-- for rankings later (R18). Plan: docs/r17-match-reporting-plan.md. Guide: docs/migrations/0014-games-for-dave.md.
--
-- Run: Supabase Dashboard → SQL Editor → paste the whole file → Run, BEFORE deploying the code
-- that needs it. Needs 0013 (Bajnokságok) first.
-- Only adds things: nothing is dropped, renamed or rewritten. It fills two things from existing
-- data: players.profile_id for championship players (from their sign-up), and a games row for
-- every already confirmed championship result. Safe to run twice. Runs in one transaction: if
-- anything fails, nothing is created.
--
-- Two ways in:
--   * standalone games (casual, ranked): a player reports, the opponent confirms or corrects,
--     unanswered reports expire after 7 days (game_report, game_respond, game_cancel, game_expire);
--   * championship games: the existing match_reports flow stays; when a result is locked the
--     server calls game_from_match, which writes or updates that match's games row.
-- People are identified by profile ID only (never by Karnyx name).

begin;

-- ============================================================================
-- 1. Championship players get their account, championships can be unrated
-- ============================================================================

-- The account behind a tournament player. Set from the sign-up when a championship starts.
-- Karnyx-league players (pasted pairings) stay null until the Karnyx import is retired (R20).
alter table public.players
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

create unique index if not exists players_tournament_profile_key
  on public.players (tournament_id, profile_id) where profile_id is not null;

update public.players p
set profile_id = r.profile_id
from public.tournament_registrations r
where p.profile_id is null
  and r.tournament_id = p.tournament_id
  and lower(r.karnyx_name) = lower(p.karnyx_name);

-- Whether this tournament's games count for the ranking (R18). Ranked games always do, casual
-- games never.
alter table public.tournaments
  add column if not exists rated boolean not null default true;

-- ============================================================================
-- 2. Games and their history
-- ============================================================================

-- Side 'a' / 'b' = profile_a / profile_b. For a standalone game the reporter is side a; for a
-- championship game a / b follow matches.player_a_id / player_b_id.
-- reported_* is the current version waiting for (or that got) the other side's confirmation; a
-- correction replaces it and flips reported_side. The full history is in game_events.
create table if not exists public.games (
  id             uuid primary key default gen_random_uuid(),
  context        text not null check (context in ('casual', 'ranked', 'tournament')),
  rated          boolean not null,
  source         text not null check (source in ('web', 'discord', 'admin')),
  status         text not null default 'pending'
                 check (status in ('pending', 'finalized', 'cancelled', 'expired', 'voided')),
  profile_a      uuid not null references public.profiles (id) on delete restrict,
  profile_b      uuid not null references public.profiles (id) on delete restrict,
  hero_a         text check (char_length(hero_a) between 1 and 60),
  hero_b         text check (char_length(hero_b) between 1 and 60),
  hp_a           smallint not null check (hp_a between 0 and 99),
  hp_b           smallint not null check (hp_b between 0 and 99),
  ult_a          smallint check (ult_a between 0 and 20),
  ult_b          smallint check (ult_b between 0 and 20),
  ban_a          text check (char_length(ban_a) between 1 and 60),
  ban_b          text check (char_length(ban_b) between 1 and 60),
  outcome        text not null check (outcome in ('a', 'b', 'draw')),
  played_at      timestamptz not null,
  match_id       uuid unique references public.matches (id) on delete cascade,
  tournament_id  uuid references public.tournaments (id) on delete cascade,
  reported_side  text not null check (reported_side in ('a', 'b', 'admin')),
  reported_by    uuid references public.profiles (id) on delete set null,
  reported_at    timestamptz not null default now(),
  confirmed_by   uuid references public.profiles (id) on delete set null,
  confirmed_at   timestamptz,
  reminders_sent smallint not null default 0 check (reminders_sent between 0 and 2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint games_two_players check (profile_a <> profile_b),
  -- A winner can't finish on 0 health (both on 0 is a draw); the loser may have health left.
  constraint games_winner_hp check (not (outcome = 'a' and hp_a = 0) and not (outcome = 'b' and hp_b = 0)),
  -- Ranked always counts, casual never; tournament games follow tournaments.rated.
  constraint games_rated check (context = 'tournament' or rated = (context = 'ranked')),
  -- Ultimates only for casual / ranked; bans only in tournaments.
  constraint games_ultimates check (context <> 'tournament' or (ult_a is null and ult_b is null)),
  constraint games_bans check (context = 'tournament' or (ban_a is null and ban_b is null)),
  -- Standalone games always name both heroes (championship results may lack picks).
  constraint games_heroes check (context = 'tournament' or (hero_a is not null and hero_b is not null)),
  constraint games_match check (context = 'tournament' or (match_id is null and tournament_id is null)),
  constraint games_finalized check (status <> 'finalized' or confirmed_at is not null)
);

alter table public.games enable row level security;
-- No policies on purpose: pending games are private to the two players and admins, so only the
-- server (service role) reads this table and checks who may see what.

create index if not exists games_profile_a_idx on public.games (profile_a, played_at desc);
create index if not exists games_profile_b_idx on public.games (profile_b, played_at desc);
create index if not exists games_pending_idx on public.games (reported_at) where status = 'pending';

-- Every change to a game: append-only, never edited (trigger below). snapshot = the game row
-- right after the change, so the ranking (R18) can replay history. actor_id has no foreign key,
-- like audit_log, so deleting a profile can't touch the history.
create table if not exists public.game_events (
  id         bigint generated always as identity primary key,
  game_id    uuid not null references public.games (id) on delete cascade,
  kind       text not null check (kind in (
               'reported', 'corrected', 'confirmed', 'cancelled', 'expired', 'voided',
               'admin_edit', 'match_locked', 'match_changed')),
  actor_id   uuid,
  snapshot   jsonb not null,
  reason     text check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);

alter table public.game_events enable row level security;

create index if not exists game_events_game_idx on public.game_events (game_id, id);

-- History rows can't be changed. They can only disappear together with their game (a deleted
-- championship takes its games with it); deleting a single history row is refused.
create or replace function public.game_events_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.games where id = old.game_id) then
    return old;
  end if;
  raise exception 'game_events_immutable';
end;
$$;

drop trigger if exists game_events_no_change on public.game_events;
create trigger game_events_no_change before update or delete on public.game_events
  for each row execute function public.game_events_immutable();

-- ============================================================================
-- 3. Functions (service role only). Errors are short codes the app turns into Hungarian text.
-- ============================================================================
-- p_fields (jsonb) holds a game's result: hero_a, hero_b, hp_a, hp_b, ult_a, ult_b (optional),
-- outcome ('a' / 'b' / 'draw'), played_at (ISO time). The app validates first; the table's
-- checks and the functions below are the last line.

-- Writes a history row with the game as it is now.
create or replace function public.game_log(p_game uuid, p_kind text, p_actor uuid, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into public.game_events (game_id, kind, actor_id, snapshot, reason)
  select g.id, p_kind, p_actor, to_jsonb(g), p_reason from public.games g where g.id = p_game;
end;
$$;

-- played_at may be at most 7 days before p_since (the report's creation) and not in the future
-- (5 minutes allowed for clock differences).
create or replace function public.game_check_played_at(p_played_at timestamptz, p_since timestamptz)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_played_at is null then raise exception 'missing_played_at'; end if;
  if p_played_at < p_since - interval '7 days' then raise exception 'played_too_long_ago'; end if;
  if p_played_at > now() + interval '5 minutes' then raise exception 'played_in_future'; end if;
end;
$$;

-- Reports a standalone game. When p_by is one of the players, it waits for the other one
-- (status pending). When p_by is an admin who didn't play, it is final at once (source 'admin').
-- Returns the new game's id.
create or replace function public.game_report(p_by uuid, p_context text, p_source text, p_profile_a uuid, p_profile_b uuid, p_fields jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_side text;
  v_id uuid;
begin
  if p_context not in ('casual', 'ranked') then raise exception 'invalid_context'; end if;
  if p_profile_a is null or p_profile_b is null or p_profile_a = p_profile_b then raise exception 'invalid_players'; end if;
  if (select count(*) from public.profiles where id in (p_profile_a, p_profile_b) and banned_at is null) <> 2 then
    raise exception 'unknown_or_banned_player';
  end if;

  if p_by = p_profile_a then v_side := 'a';
  elsif p_by = p_profile_b then v_side := 'b';
  elsif exists (select 1 from public.profiles where id = p_by and is_admin and banned_at is null) then v_side := 'admin';
  else raise exception 'not_allowed';
  end if;

  perform public.game_check_played_at((p_fields->>'played_at')::timestamptz, now());

  insert into public.games (
    context, rated, source, status, profile_a, profile_b,
    hero_a, hero_b, hp_a, hp_b, ult_a, ult_b, outcome, played_at,
    reported_side, reported_by, confirmed_by, confirmed_at
  ) values (
    p_context, p_context = 'ranked', case when v_side = 'admin' then 'admin' else p_source end,
    case when v_side = 'admin' then 'finalized' else 'pending' end,
    p_profile_a, p_profile_b,
    p_fields->>'hero_a', p_fields->>'hero_b', (p_fields->>'hp_a')::smallint, (p_fields->>'hp_b')::smallint,
    (p_fields->>'ult_a')::smallint, (p_fields->>'ult_b')::smallint, p_fields->>'outcome',
    (p_fields->>'played_at')::timestamptz,
    v_side, p_by,
    case when v_side = 'admin' then p_by end, case when v_side = 'admin' then now() end
  ) returning id into v_id;

  perform public.game_log(v_id, 'reported', p_by, null);
  if v_side = 'admin' then perform public.game_log(v_id, 'confirmed', p_by, null); end if;
  return v_id;
end;
$$;

-- The other player answers a pending standalone game. p_seen = the reported_at the player saw:
-- if the report changed since, nothing happens ('report_changed'). p_fields null, or the same
-- result as reported, confirms it (status finalized). A different result is a correction: it
-- becomes the pending version, waits for the first player, and restarts the 7 days and the
-- reminders. Returns 'confirmed' or 'corrected'.
create or replace function public.game_respond(p_game uuid, p_by uuid, p_seen timestamptz, p_fields jsonb)
returns text
language plpgsql
set search_path = public
as $$
declare
  g public.games;
  v_side text;
begin
  select * into g from public.games where id = p_game for update;
  if not found then raise exception 'unknown_game'; end if;
  if g.context = 'tournament' then raise exception 'tournament_game'; end if;
  if g.status <> 'pending' then raise exception 'not_pending'; end if;
  if g.reported_at <> p_seen then raise exception 'report_changed'; end if;

  v_side := case p_by when g.profile_a then 'a' when g.profile_b then 'b' end;
  if v_side is null or v_side = g.reported_side then raise exception 'not_allowed'; end if;

  if p_fields is null or (
       g.hero_a is not distinct from p_fields->>'hero_a'
       and g.hero_b is not distinct from p_fields->>'hero_b'
       and g.hp_a = (p_fields->>'hp_a')::smallint
       and g.hp_b = (p_fields->>'hp_b')::smallint
       and g.ult_a is not distinct from (p_fields->>'ult_a')::smallint
       and g.ult_b is not distinct from (p_fields->>'ult_b')::smallint
       and g.outcome = p_fields->>'outcome'
       and g.played_at = (p_fields->>'played_at')::timestamptz) then
    update public.games
    set status = 'finalized', confirmed_by = p_by, confirmed_at = now(), updated_at = now()
    where id = p_game;
    perform public.game_log(p_game, 'confirmed', p_by, null);
    return 'confirmed';
  end if;

  perform public.game_check_played_at((p_fields->>'played_at')::timestamptz, g.created_at);
  update public.games
  set hero_a = p_fields->>'hero_a', hero_b = p_fields->>'hero_b',
      hp_a = (p_fields->>'hp_a')::smallint, hp_b = (p_fields->>'hp_b')::smallint,
      ult_a = (p_fields->>'ult_a')::smallint, ult_b = (p_fields->>'ult_b')::smallint,
      outcome = p_fields->>'outcome', played_at = (p_fields->>'played_at')::timestamptz,
      reported_side = v_side, reported_by = p_by, reported_at = now(), reminders_sent = 0,
      updated_at = now()
  where id = p_game;
  perform public.game_log(p_game, 'corrected', p_by, null);
  return 'corrected';
end;
$$;

-- The player whose version is pending withdraws it (Visszavonom).
create or replace function public.game_cancel(p_game uuid, p_by uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  g public.games;
  v_reporter uuid;
begin
  select * into g from public.games where id = p_game for update;
  if not found then raise exception 'unknown_game'; end if;
  if g.context = 'tournament' then raise exception 'tournament_game'; end if;
  if g.status <> 'pending' then raise exception 'not_pending'; end if;
  v_reporter := case g.reported_side when 'a' then g.profile_a when 'b' then g.profile_b end;
  if p_by is distinct from v_reporter then raise exception 'not_allowed'; end if;
  update public.games set status = 'cancelled', updated_at = now() where id = p_game;
  perform public.game_log(p_game, 'cancelled', p_by, null);
end;
$$;

-- Hourly cron: every pending game whose current version is 7 days old expires, with no effect
-- on anything (never an automatic win). Returns how many expired.
create or replace function public.game_expire(p_now timestamptz)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_count int := 0;
begin
  for v_id in
    update public.games set status = 'expired', updated_at = now()
    where status = 'pending' and reported_at <= p_now - interval '7 days'
    returning id
  loop
    perform public.game_log(v_id, 'expired', null, null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- An admin takes a pending or final standalone game out of everything (stats, ranking).
create or replace function public.game_void(p_game uuid, p_by uuid, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  g public.games;
begin
  if not exists (select 1 from public.profiles where id = p_by and is_admin and banned_at is null) then
    raise exception 'not_allowed';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'reason_required'; end if;
  select * into g from public.games where id = p_game for update;
  if not found then raise exception 'unknown_game'; end if;
  if g.context = 'tournament' then raise exception 'tournament_game'; end if;
  if g.status not in ('pending', 'finalized') then raise exception 'not_open'; end if;
  update public.games set status = 'voided', updated_at = now() where id = p_game;
  perform public.game_log(p_game, 'voided', p_by, left(trim(p_reason), 300));
end;
$$;

-- An admin sets the result of a pending or final standalone game; a pending one becomes final
-- (this is how an admin settles a stuck game). The reason is required.
create or replace function public.game_admin_edit(p_game uuid, p_by uuid, p_fields jsonb, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  g public.games;
begin
  if not exists (select 1 from public.profiles where id = p_by and is_admin and banned_at is null) then
    raise exception 'not_allowed';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'reason_required'; end if;
  select * into g from public.games where id = p_game for update;
  if not found then raise exception 'unknown_game'; end if;
  if g.context = 'tournament' then raise exception 'tournament_game'; end if;
  if g.status not in ('pending', 'finalized') then raise exception 'not_open'; end if;
  perform public.game_check_played_at((p_fields->>'played_at')::timestamptz, g.created_at);

  update public.games
  set hero_a = p_fields->>'hero_a', hero_b = p_fields->>'hero_b',
      hp_a = (p_fields->>'hp_a')::smallint, hp_b = (p_fields->>'hp_b')::smallint,
      ult_a = (p_fields->>'ult_a')::smallint, ult_b = (p_fields->>'ult_b')::smallint,
      outcome = p_fields->>'outcome', played_at = (p_fields->>'played_at')::timestamptz,
      status = 'finalized',
      confirmed_by = case when g.status = 'pending' then p_by else g.confirmed_by end,
      confirmed_at = case when g.status = 'pending' then now() else g.confirmed_at end,
      updated_at = now()
  where id = p_game;
  perform public.game_log(p_game, 'admin_edit', p_by, left(trim(p_reason), 300));
end;
$$;

-- Writes or updates the games row of a championship match from its locked (confirmed) result.
-- Called by the server whenever a result locks, also when an admin changes a locked result.
-- Returns the game's id, or null when there is nothing to write: no locked report, a Bye, or a
-- player without an account (Karnyx-league rows). Does nothing when the result is unchanged.
create or replace function public.game_from_match(p_match uuid, p_by uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  r public.match_reports;
  v_profile_a uuid;
  v_profile_b uuid;
  v_tournament uuid;
  v_rated boolean;
  v_played timestamptz;
  v_old public.games;
  v_id uuid;
begin
  select * into r from public.match_reports where match_id = p_match and confirmed_at is not null;
  if not found then return null; end if;

  select pa.profile_id, pb.profile_id, t.id, t.rated, coalesce(m.played_at, r.confirmed_at)
  into v_profile_a, v_profile_b, v_tournament, v_rated, v_played
  from public.matches m
  join public.rounds rd on rd.id = m.round_id
  join public.tournaments t on t.id = rd.tournament_id
  join public.players pa on pa.id = m.player_a_id
  join public.players pb on pb.id = m.player_b_id
  where m.id = p_match;
  if v_profile_a is null or v_profile_b is null or v_profile_a = v_profile_b then return null; end if;

  select * into v_old from public.games where match_id = p_match for update;
  if not found then
    insert into public.games (
      context, rated, source, status, profile_a, profile_b,
      hero_a, hero_b, hp_a, hp_b, ban_a, ban_b, outcome, played_at,
      match_id, tournament_id, reported_side, reported_by, reported_at, confirmed_by, confirmed_at
    ) values (
      'tournament', v_rated, case when r.submitted_side = 'admin' then 'admin' else 'web' end, 'finalized',
      v_profile_a, v_profile_b,
      r.pick_a, r.pick_b, r.hp_a, r.hp_b, r.ban_a, r.ban_b, r.outcome, v_played,
      p_match, v_tournament, r.submitted_side, r.submitted_by, r.submitted_at, r.confirmed_by, r.confirmed_at
    ) returning id into v_id;
    perform public.game_log(v_id, 'match_locked', p_by, null);
    return v_id;
  end if;

  if v_old.profile_a = v_profile_a and v_old.profile_b = v_profile_b
     and v_old.hero_a is not distinct from r.pick_a and v_old.hero_b is not distinct from r.pick_b
     and v_old.hp_a = r.hp_a and v_old.hp_b = r.hp_b
     and v_old.ban_a is not distinct from r.ban_a and v_old.ban_b is not distinct from r.ban_b
     and v_old.outcome = r.outcome and v_old.status = 'finalized' then
    return v_old.id;
  end if;

  update public.games
  set profile_a = v_profile_a, profile_b = v_profile_b,
      hero_a = r.pick_a, hero_b = r.pick_b, hp_a = r.hp_a, hp_b = r.hp_b,
      ban_a = r.ban_a, ban_b = r.ban_b, outcome = r.outcome, status = 'finalized',
      reported_side = r.submitted_side, reported_by = r.submitted_by, reported_at = r.submitted_at,
      confirmed_by = r.confirmed_by, confirmed_at = r.confirmed_at, updated_at = now()
  where id = v_old.id;
  perform public.game_log(v_old.id, 'match_changed', p_by, null);
  return v_old.id;
end;
$$;

revoke execute on function public.game_events_immutable() from public, anon, authenticated;
revoke execute on function public.game_log(uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.game_check_played_at(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.game_report(uuid, text, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.game_respond(uuid, uuid, timestamptz, jsonb) from public, anon, authenticated;
revoke execute on function public.game_cancel(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.game_expire(timestamptz) from public, anon, authenticated;
revoke execute on function public.game_void(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.game_admin_edit(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.game_from_match(uuid, uuid) from public, anon, authenticated;
grant execute on function public.game_log(uuid, text, uuid, text) to service_role;
grant execute on function public.game_check_played_at(timestamptz, timestamptz) to service_role;
grant execute on function public.game_report(uuid, text, text, uuid, uuid, jsonb) to service_role;
grant execute on function public.game_respond(uuid, uuid, timestamptz, jsonb) to service_role;
grant execute on function public.game_cancel(uuid, uuid) to service_role;
grant execute on function public.game_expire(timestamptz) to service_role;
grant execute on function public.game_void(uuid, uuid, text) to service_role;
grant execute on function public.game_admin_edit(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.game_from_match(uuid, uuid) to service_role;

-- ============================================================================
-- 4. Copy the championship results that are already locked
-- ============================================================================

-- Prints how many locked championship results now have a games row (on a second run it counts
-- the existing ones again without copying anything). 0 is normal: the live match_reports was
-- empty on 2026-11-14.
select count(public.game_from_match(match_id, null)) as championship_games
from public.match_reports where confirmed_at is not null;

commit;
