-- 0012: Bajnokságok (built-in championships)
--
-- Championships are tournaments run on the site itself: sign-up with 3 heroes, automatic
-- Swiss pairing, results reported by the players. They reuse the Időpontfoglaló's tables
-- (tournaments, players, rounds, matches, proposals), so the existing Karnyx league data keeps
-- working as-is: every change here is additive, nothing is dropped or renamed, and old
-- tournaments get format = 'manual'.
--
-- Run in: Supabase Dashboard → SQL Editor → paste and run, before the code is deployed.

-- ============================================================================
-- 1. Tournaments
-- ============================================================================

-- Pairing format. 'manual' = the Karnyx league (existing behaviour, default for old rows).
-- Only Swiss is playable on the site so far; the others are listed as coming soon.
alter table public.tournaments
  add column if not exists format text not null default 'manual'
  check (format in (
    'manual',
    'swiss',
    'round_robin',
    'single_elimination',
    'double_elimination',
    'groups_playoffs'
  ));

-- Games per match (only 1 is used so far; 3 and 5 are reserved for best-of series).
alter table public.tournaments
  add column if not exists best_of smallint not null default 1
  check (best_of in (1, 3, 5));

-- Format settings as JSON, e.g. {"rounds": 5, "round_days": 7} for Swiss.
alter table public.tournaments
  add column if not exists settings jsonb not null default '{}';

-- Address of a championship page (/bajnoksagok/<slug>); null for the Karnyx league.
alter table public.tournaments
  add column if not exists slug text unique;

-- Lifecycle of a championship. The Karnyx league ignores it and keeps using is_active;
-- championships are created with is_active = false, so the Időpontfoglaló never shows them.
alter table public.tournaments
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'registration', 'running', 'finished'));

-- When registration closes and the championship starts (null = an admin starts it by hand).
alter table public.tournaments
  add column if not exists starts_at timestamptz;

-- Pair automatically: round 1 at the start, the next round when every result is final.
alter table public.tournaments
  add column if not exists auto_pairing boolean not null default true;

-- ============================================================================
-- 2. Match results
-- ============================================================================

-- The winner of a finished match (same players table as player_a_id / player_b_id).
alter table public.matches
  add column if not exists winner_id uuid references public.players(id);

-- A finished match can end in a draw (both players reach 0 health at once): no winner_id.
alter table public.matches
  add column if not exists is_draw boolean not null default false;

-- The current result report of a championship match, one row per match. A player submits it,
-- the opponent confirms it (or corrects it, which makes the correction the pending report);
-- once confirmed it is locked and only admins can change it. An admin's report is locked
-- right away. The locked report is copied onto matches (winner_id / is_draw / status).
-- Side 'a' / 'b' = matches.player_a_id / player_b_id. ban_a = which of A's heroes was banned.
create table if not exists public.match_reports (
  match_id       uuid primary key references public.matches(id) on delete cascade,
  outcome        text not null check (outcome in ('a', 'b', 'draw')),
  hp_a           smallint not null check (hp_a between 0 and 99),
  hp_b           smallint not null check (hp_b between 0 and 99),
  pick_a         text,
  pick_b         text,
  ban_a          text,
  ban_b          text,
  submitted_side text not null check (submitted_side in ('a', 'b', 'admin')),
  submitted_by   uuid references public.profiles(id) on delete set null,
  submitted_at   timestamptz not null default now(),
  confirmed_by   uuid references public.profiles(id) on delete set null,
  confirmed_at   timestamptz
);

alter table public.match_reports enable row level security;

create policy "match_reports public read"
  on public.match_reports for select using (true);

-- ============================================================================
-- 3. Registrations (before the start)
-- ============================================================================

-- A signed-in user's entry with their 3 heroes. Hero picks stay secret until the start, so
-- this table has RLS on and NO select policy: only the server (service role) reads it.
-- At the start every registration becomes a row in public.players.
create table if not exists public.tournament_registrations (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  karnyx_name   text not null,
  heroes        text[] not null check (cardinality(heroes) = 3),
  locked_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (tournament_id, profile_id)
);

alter table public.tournament_registrations enable row level security;

-- "My championships" looks registrations up by profile.
create index if not exists tournament_registrations_profile_idx
  on public.tournament_registrations (profile_id);
