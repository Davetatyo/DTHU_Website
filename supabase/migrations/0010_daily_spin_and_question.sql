-- 0010 · Daily spin (Szerencsekerék), daily question (Napi kérdés), their streaks, economy settings and
-- an audit log. Spec: DTHU_COINS_SPEC.md §2, §3.2–3.4, §4.2 (settings, audit), §5.
-- Run: Supabase Dashboard → SQL Editor → paste the whole file → Run, BEFORE deploying the code
-- that needs it. Needs 0009 (DTHU coins) first.
-- Only adds things and no data: every setting has its default in the code
-- (src/features/games/lib/economy.ts) until an admin changes it. Safe to run twice. Runs in one
-- transaction: if anything fails, nothing is created.
--
-- A "day" is a calendar day in Europe/Budapest, starting at 00:00. The server works out the day
-- and passes it in, so every function below takes it as p_day.

begin;

-- Economy settings edited on the admin page (spin table, rewards, streak, ticket price, …).
-- A missing key means "use the default from the code".
create table if not exists public.economy_config (
  key text primary key check (key ~ '^[a-z_]{1,60}$'),
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Every admin change to settings and questions: who, when, before, after, why. Never edited or
-- deleted (trigger below). actor_id has no foreign key on purpose, so deleting a profile can't
-- touch the log.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null check (char_length(action) between 1 and 60),
  entity_type text not null check (char_length(entity_type) between 1 and 60),
  entity_id text,
  before jsonb,
  after jsonb,
  reason text check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_log_immutable';
end;
$$;

drop trigger if exists audit_log_no_change on public.audit_log;
create trigger audit_log_no_change before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- One spin per player per day (the unique key is the real guard against a second spin).
create table if not exists public.daily_spins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  result_label text not null check (char_length(result_label) between 1 and 40),
  coins int not null check (coins between 0 and 100000),
  created_at timestamptz not null default now(),
  unique (profile_id, day)
);

-- The question bank. Answers and explanations stay on the server until a player has answered.
create table if not exists public.daily_questions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('trivia', 'rules', 'champion_zoom', 'ability_card', 'puzzle', 'community')),
  prompt text not null check (char_length(prompt) between 1 and 600),
  answer_mode text not null check (answer_mode in ('multiple_choice', 'text')),
  -- multiple_choice: 2–6 option texts and the index of the correct one
  options jsonb check (options is null or jsonb_typeof(options) = 'array'),
  correct_option int check (correct_option is null or correct_option between 0 and 5),
  -- text: accepted answers (matched ignoring case, spaces and accents)
  accepted_answers text[],
  explanation text check (char_length(explanation) <= 1000),
  difficulty text not null default 'normal' check (difficulty in ('normal', 'hard')),
  reward_override int check (reward_override is null or reward_override between 0 and 1000),
  -- draft: not ready · scheduled: ready (with or without a date) · published: has been a
  -- daily question · archived: never used again
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  publish_date date unique,
  times_used int not null default 0,
  last_used_date date,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (answer_mode <> 'multiple_choice' or (options is not null and jsonb_array_length(options) between 2 and 6 and correct_option is not null)),
  check (answer_mode <> 'text' or coalesce(array_length(accepted_answers, 1), 0) >= 1)
);

create index if not exists daily_questions_status_idx on public.daily_questions (status, last_used_date);

-- Which question each day used, fixed the first time the day's question is asked for (also when
-- it came from the fallback), so everyone gets the same one.
create table if not exists public.daily_question_days (
  day date primary key,
  question_id uuid not null references public.daily_questions (id) on delete restrict,
  chosen_at timestamptz not null default now()
);

create table if not exists public.daily_question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.daily_questions (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  answer text not null check (char_length(answer) between 1 and 200),
  is_correct boolean not null,
  coins int not null check (coins between 0 and 100000),
  created_at timestamptz not null default now(),
  -- One answer per player per day. Not unique per question on purpose: bank questions are reused
  -- on later days (fallback, "reuse"), and a reused question is a new attempt that day.
  unique (profile_id, day)
);

-- Streaks (owner, 2026-11-03): two separate ones, the spin and the daily question each count
-- their own days in a row. Days are counted 1..p_length; the last day of a round pays the bonus
-- and the next day starts a new round at 1.
create table if not exists public.daily_streaks (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('spin', 'quiz')),
  current_length int not null default 0 check (current_length >= 0),
  last_completed_date date,
  primary key (profile_id, game)
);

alter table public.economy_config enable row level security;
alter table public.audit_log enable row level security;
alter table public.daily_spins enable row level security;
alter table public.daily_questions enable row level security;
alter table public.daily_question_days enable row level security;
alter table public.daily_question_answers enable row level security;
alter table public.daily_streaks enable row level security;

-- Coins can now also come from the spin, the daily question and the streak bonus.
alter table public.coin_ledger drop constraint if exists coin_ledger_kind_check;
alter table public.coin_ledger add constraint coin_ledger_kind_check
  check (kind in ('award', 'shop_purchase', 'spin', 'daily_question', 'streak'));

-- ---------------------------------------------------------------------------------------------
-- Functions (service role only). Errors are short codes the app turns into Hungarian text.
-- ---------------------------------------------------------------------------------------------

-- Called after a spin (p_game 'spin') or an answer (p_game 'quiz'): counts p_day for that game.
-- The day right after the last counted one goes on (2, 3, … p_length); after a missed day, or
-- after a finished round, it starts again at 1. Reaching p_length pays p_bonus on top of the
-- day's own win (even when that was 0). Returns the bonus paid (0 or p_bonus).
create or replace function public.daily_streak_touch(p_profile uuid, p_game text, p_day date, p_length int, p_bonus int)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_len int;
  v_last date;
  v_paid int := 0;
begin
  insert into public.daily_streaks (profile_id, game) values (p_profile, p_game) on conflict (profile_id, game) do nothing;
  select current_length, last_completed_date into v_len, v_last
  from public.daily_streaks where profile_id = p_profile and game = p_game for update;
  if v_last = p_day then return 0; end if;

  v_len := case when v_last = p_day - 1 and v_len < p_length then v_len + 1 else 1 end;
  if p_length >= 1 and v_len = p_length and p_bonus > 0 then
    insert into public.coin_ledger (profile_id, amount, kind, reason, created_by)
    values (p_profile, p_bonus, 'streak',
            p_length || ' napos ' || case p_game when 'spin' then 'pörgetés' else 'kvíz' end || '-sorozat', p_profile);
    v_paid := p_bonus;
  end if;
  update public.daily_streaks set current_length = v_len, last_completed_date = p_day
  where profile_id = p_profile and game = p_game;
  return v_paid;
end;
$$;

-- Records a player's spin for p_day. The server drew the result (crypto-random, from the spin
-- table in the settings); this stores it once and pays it. A second spin the same day raises
-- 'already_spun'. Returns {coins, streak_bonus}.
create or replace function public.daily_spin(p_profile uuid, p_day date, p_label text, p_coins int, p_streak_length int, p_streak_bonus int)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_bonus int;
begin
  if p_coins is null or p_coins < 0 then raise exception 'invalid_prize'; end if;
  perform 1 from public.profiles where id = p_profile and banned_at is null for update;
  if not found then raise exception 'unknown_profile'; end if;

  begin
    insert into public.daily_spins (profile_id, day, result_label, coins) values (p_profile, p_day, left(p_label, 40), p_coins);
  exception when unique_violation then
    raise exception 'already_spun';
  end;
  if p_coins > 0 then
    insert into public.coin_ledger (profile_id, amount, kind, reason, created_by)
    values (p_profile, p_coins, 'spin', 'Szerencsekerék: ' || left(p_label, 40), p_profile);
  end if;
  v_bonus := public.daily_streak_touch(p_profile, 'spin', p_day, p_streak_length, p_streak_bonus);
  return jsonb_build_object('coins', p_coins, 'streak_bonus', v_bonus);
end;
$$;

-- The question of p_day: the one already fixed for that day; else the one scheduled for that
-- date; else (when p_fallback) the least recently used ready question, preferring
-- p_preferred_type. The choice is stored, so every later call that day returns the same one.
-- Returns null when there is nothing to ask.
create or replace function public.daily_question_for(p_day date, p_fallback boolean, p_preferred_type text)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  select question_id into v_id from public.daily_question_days where day = p_day;
  if found then return v_id; end if;

  select id into v_id from public.daily_questions
  where publish_date = p_day and status in ('scheduled', 'published');
  if not found and p_fallback then
    select id into v_id from public.daily_questions
    where status in ('scheduled', 'published') and (publish_date is null or publish_date < p_day)
    order by (type = p_preferred_type) desc, last_used_date asc nulls first, created_at asc
    limit 1;
  end if;
  if v_id is null then return null; end if;

  insert into public.daily_question_days (day, question_id) values (p_day, v_id) on conflict (day) do nothing;
  select question_id into v_id from public.daily_question_days where day = p_day;
  update public.daily_questions
  set status = 'published', times_used = times_used + 1, last_used_date = p_day
  where id = v_id and (last_used_date is distinct from p_day);
  return v_id;
end;
$$;

-- Records a player's one answer to the question of p_day. The server checked the answer; this
-- stores it once and pays p_coins when correct. Refuses a question that isn't p_day's
-- ('wrong_question') and a second answer ('already_answered'). Returns {coins, streak_bonus}.
create or replace function public.daily_answer(p_profile uuid, p_day date, p_question uuid, p_answer text, p_correct boolean, p_coins int, p_streak_length int, p_streak_bonus int)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_paid int;
  v_bonus int;
begin
  perform 1 from public.profiles where id = p_profile and banned_at is null for update;
  if not found then raise exception 'unknown_profile'; end if;
  if not exists (select 1 from public.daily_question_days where day = p_day and question_id = p_question) then
    raise exception 'wrong_question';
  end if;
  v_paid := case when p_correct then greatest(coalesce(p_coins, 0), 0) else 0 end;

  begin
    insert into public.daily_question_answers (question_id, profile_id, day, answer, is_correct, coins)
    values (p_question, p_profile, p_day, left(coalesce(nullif(trim(p_answer), ''), '–'), 200), p_correct, v_paid);
  exception when unique_violation then
    raise exception 'already_answered';
  end;
  if v_paid > 0 then
    insert into public.coin_ledger (profile_id, amount, kind, reason, created_by)
    values (p_profile, v_paid, 'daily_question', 'Napi kérdés (' || to_char(p_day, 'YYYY-MM-DD') || ')', p_profile);
  end if;
  v_bonus := public.daily_streak_touch(p_profile, 'quiz', p_day, p_streak_length, p_streak_bonus);
  return jsonb_build_object('coins', v_paid, 'streak_bonus', v_bonus);
end;
$$;

-- An admin changes one setting; the change and its before/after go to the audit log together.
create or replace function public.economy_config_set(p_key text, p_value jsonb, p_by uuid, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_before jsonb;
begin
  select value into v_before from public.economy_config where key = p_key;
  if v_before is not distinct from p_value then return; end if;
  insert into public.economy_config (key, value, updated_by, updated_at) values (p_key, p_value, p_by, now())
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after, reason)
  values (p_by, 'config_set', 'economy_config', p_key, v_before, p_value, left(p_reason, 300));
end;
$$;

-- Only the server may call these (the anon key is public).
revoke execute on function public.daily_streak_touch(uuid, text, date, int, int) from public, anon, authenticated;
revoke execute on function public.daily_spin(uuid, date, text, int, int, int) from public, anon, authenticated;
revoke execute on function public.daily_question_for(date, boolean, text) from public, anon, authenticated;
revoke execute on function public.daily_answer(uuid, date, uuid, text, boolean, int, int, int) from public, anon, authenticated;
revoke execute on function public.economy_config_set(text, jsonb, uuid, text) from public, anon, authenticated;
revoke execute on function public.audit_log_immutable() from public, anon, authenticated;
grant execute on function public.daily_streak_touch(uuid, text, date, int, int) to service_role;
grant execute on function public.daily_spin(uuid, date, text, int, int, int) to service_role;
grant execute on function public.daily_question_for(date, boolean, text) to service_role;
grant execute on function public.daily_answer(uuid, date, uuid, text, boolean, int, int, int) to service_role;
grant execute on function public.economy_config_set(text, jsonb, uuid, text) to service_role;

commit;
