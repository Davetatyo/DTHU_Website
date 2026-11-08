-- 0012 · XP and levels (roadmap R4). Feature guide: src/features/xp/README.md.
-- Run: Supabase Dashboard → SQL Editor → paste the whole file → Run, BEFORE deploying the code
-- that needs it. Needs 0010 (audit_log). Only adds things. Safe to run twice. One transaction.
--
-- Every XP change is a row in xp_events and goes through xp_award or xp_admin_adjust, which only
-- the server can call. The database decides the amount (xp_activities), applies double XP
-- (xp_boosts) and refuses duplicates (one row per player, activity and reference), so a match,
-- a day or a tournament can never pay twice. Levels are worked out from the total in the code.

begin;

-- What each activity is worth. Admins edit amounts and switch activities on and off; new keys
-- come with a code release.
create table if not exists public.xp_activities (
  key text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  amount int not null check (amount between 0 and 1000 and amount % 5 = 0),
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.xp_activities (key, name, amount, sort_order) values
  ('tournament_game', 'Lejátszott versenymeccs (Bye is)', 15, 10),
  ('tournament_finish', 'Verseny befejezése', 30, 20),
  ('podium_1', '1. hely', 300, 30),
  ('podium_2', '2. hely', 200, 31),
  ('podium_3', '3. hely', 150, 32),
  ('live_event', 'Élő esemény', 50, 40),
  ('site_tutorial', 'Az oldal bemutatója', 25, 50),
  ('tutorial', 'Egyéb bemutató', 25, 51),
  ('daily_game', 'A nap játéka', 5, 60),
  ('daily_quiz', 'Napi kvíz, helyes válasz', 5, 61),
  ('news_like', 'Hír megerősítése (tetszik)', 5, 70)
on conflict (key) do nothing;

-- Settings: the level curve ({"first": 25, "step": 20}). A missing key = the code's default.
create table if not exists public.xp_config (
  key text primary key check (key ~ '^[a-z_]{1,40}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Double XP. Either a time window for chosen activities (activity_keys null = every activity),
-- or a tournament: then every XP of that tournament counts double, whenever it is given.
create table if not exists public.xp_boosts (
  id uuid primary key default gen_random_uuid(),
  multiplier int not null default 2 check (multiplier between 2 and 3),
  starts_at timestamptz,
  ends_at timestamptz,
  activity_keys text[],
  tournament_id uuid references public.tournaments (id) on delete cascade,
  note text check (char_length(note) <= 200),
  created_by uuid,
  created_at timestamptz not null default now(),
  check (tournament_id is not null or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  activity text not null check (char_length(activity) between 1 and 40),
  amount int not null check (amount <> 0 and amount % 5 = 0),
  multiplier int not null default 1 check (multiplier between 1 and 3),
  -- What it was for, e.g. 'match:<id>' or 'tournament:<id>'. With the player and activity it makes
  -- the duplicate check.
  ref text not null check (char_length(ref) between 1 and 120),
  tournament_id uuid references public.tournaments (id) on delete set null,
  reason text check (char_length(reason) <= 200),
  given_by uuid,
  -- When the player was shown it (notification, level-up popup).
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, activity, ref)
);

create index if not exists xp_events_profile_idx on public.xp_events (profile_id, created_at desc);
create index if not exists xp_events_unseen_idx on public.xp_events (profile_id) where seen_at is null;

-- Gives one activity's XP to a player, once per reference. Returns the XP given (0 if the activity
-- is off or this was already given).
create or replace function public.xp_award(
  p_profile uuid, p_activity text, p_ref text, p_tournament uuid default null, p_by uuid default null, p_reason text default null
) returns int
language plpgsql
set search_path = public
as $$
declare
  v_amount int;
  v_mult int;
  v_given int;
begin
  select amount into v_amount from public.xp_activities where key = p_activity and active;
  if v_amount is null or v_amount = 0 then return 0; end if;

  select coalesce(max(multiplier), 1) into v_mult from public.xp_boosts b
  where (b.tournament_id is not null and b.tournament_id = p_tournament)
     or (b.tournament_id is null and now() >= b.starts_at and now() < b.ends_at
         and (b.activity_keys is null or p_activity = any (b.activity_keys)));

  insert into public.xp_events (profile_id, activity, amount, multiplier, ref, tournament_id, reason, given_by)
  values (p_profile, p_activity, v_amount * v_mult, v_mult, p_ref, p_tournament, left(p_reason, 200), p_by)
  on conflict (profile_id, activity, ref) do nothing
  returning amount into v_given;
  return coalesce(v_given, 0);
end;
$$;

-- An admin gives or takes XP by hand, with a reason. A total can't go below zero.
-- Returns the player's new total.
create or replace function public.xp_admin_adjust(p_profile uuid, p_amount int, p_reason text, p_by uuid)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_total int;
begin
  if p_amount = 0 or p_amount % 5 <> 0 then raise exception 'bad_amount'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'missing_reason'; end if;
  perform 1 from public.profiles where id = p_profile for update;
  if not found then raise exception 'unknown_profile'; end if;
  select coalesce(sum(amount), 0) into v_total from public.xp_events where profile_id = p_profile;
  if v_total + p_amount < 0 then raise exception 'below_zero'; end if;
  insert into public.xp_events (profile_id, activity, amount, ref, reason, given_by)
  values (p_profile, 'admin_manual', p_amount, gen_random_uuid()::text, left(trim(p_reason), 200), p_by);
  return v_total + p_amount;
end;
$$;

revoke execute on function public.xp_award(uuid, text, text, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.xp_admin_adjust(uuid, int, text, uuid) from public, anon, authenticated;
grant execute on function public.xp_award(uuid, text, text, uuid, uuid, text) to service_role;
grant execute on function public.xp_admin_adjust(uuid, int, text, uuid) to service_role;

-- No policies: only the server reads and writes these.
alter table public.xp_activities enable row level security;
alter table public.xp_config enable row level security;
alter table public.xp_boosts enable row level security;
alter table public.xp_events enable row level security;

commit;
