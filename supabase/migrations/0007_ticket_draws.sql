-- 0007 · Sorsolás (ticket draws): ticket ledger, draws, entries, winners.
-- Run: Supabase Dashboard → SQL Editor → paste the whole file → Run, BEFORE deploying the code
-- that needs it (see STATE.md → Needs the owner).
-- Only adds things (four new tables, five functions) and no data. Safe to run twice. Runs in
-- one transaction: if anything fails, nothing is created.
--
-- Model:
--   ticket_ledger        every change to a player's balance (+ awards, − draw entries, + refunds).
--                        Balance = sum(amount). Rows are never updated or deleted.
--   ticket_draws         a draw event: prize, closing time, number of winners, optional cap.
--   ticket_draw_entries  tickets a player put into a draw (1 ticket = 1 entry).
--   ticket_draw_winners  the result, written once when the draw is held.
--
-- All writes go through the functions below (called by the server with the service-role key),
-- so the balance can never go negative and no entry can arrive after a draw closed.

begin;

create table if not exists public.ticket_draws (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  prize text not null check (char_length(prize) between 1 and 200),
  description text check (char_length(description) <= 1000),
  closes_at timestamptz not null,
  winner_count int not null default 1 check (winner_count between 1 and 100),
  max_tickets_per_player int check (max_tickets_per_player between 1 and 9999),
  status text not null default 'open' check (status in ('open', 'drawn', 'cancelled')),
  drawn_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_draws_status_idx on public.ticket_draws (status, closes_at);

create table if not exists public.ticket_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount <> 0 and amount between -9999 and 9999),
  kind text not null check (kind in ('award', 'draw_entry', 'draw_refund')),
  reason text not null check (char_length(reason) between 1 and 200),
  draw_id uuid references public.ticket_draws (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_ledger_profile_idx on public.ticket_ledger (profile_id, created_at desc);

create table if not exists public.ticket_draw_entries (
  draw_id uuid not null references public.ticket_draws (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tickets int not null check (tickets > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (draw_id, profile_id)
);

create table if not exists public.ticket_draw_winners (
  draw_id uuid not null references public.ticket_draws (id) on delete cascade,
  place int not null check (place >= 1),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (draw_id, place),
  unique (draw_id, profile_id)
);

-- Like the other newer tables (0002+): row level security on and no policies, so the browser
-- can't read or write them directly; the server reads and writes with the service role.
alter table public.ticket_draws enable row level security;
alter table public.ticket_ledger enable row level security;
alter table public.ticket_draw_entries enable row level security;
alter table public.ticket_draw_winners enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Functions. Errors are raised with a short code as the message; the app turns them into
-- Hungarian text (src/features/tickets/lib/errors.ts). Each pins its search_path (Supabase's
-- security advisor flags functions without one).
-- ---------------------------------------------------------------------------------------------

-- Admin gives (or, with a negative amount, takes back) tickets. Refuses to go below zero.
create or replace function public.ticket_award(p_profile uuid, p_amount int, p_reason text, p_by uuid)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_amount = 0 then raise exception 'zero_amount'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'missing_reason'; end if;
  -- One balance change per player at a time.
  perform 1 from public.profiles where id = p_profile for update;
  if not found then raise exception 'unknown_profile'; end if;

  select coalesce(sum(amount), 0) into v_balance from public.ticket_ledger where profile_id = p_profile;
  if v_balance + p_amount < 0 then raise exception 'not_enough_tickets'; end if;

  insert into public.ticket_ledger (profile_id, amount, kind, reason, created_by)
  values (p_profile, p_amount, 'award', left(trim(p_reason), 200), p_by);
  return v_balance + p_amount;
end;
$$;

-- A player puts p_tickets more tickets into an open draw. Returns their total tickets in it.
-- Banned players (profiles.banned_at, migration 0002) can't enter.
create or replace function public.ticket_draw_enter(p_draw uuid, p_profile uuid, p_tickets int)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_draw public.ticket_draws%rowtype;
  v_balance int;
  v_current int;
begin
  if p_tickets is null or p_tickets < 1 then raise exception 'invalid_amount'; end if;

  -- Locking the draw row orders entries against the draw itself (see ticket_draw_complete).
  select * into v_draw from public.ticket_draws where id = p_draw for update;
  if not found then raise exception 'unknown_draw'; end if;
  if v_draw.status <> 'open' or v_draw.closes_at <= clock_timestamp() then raise exception 'draw_closed'; end if;

  perform 1 from public.profiles where id = p_profile and banned_at is null for update;
  if not found then raise exception 'unknown_profile'; end if;

  select coalesce(sum(amount), 0) into v_balance from public.ticket_ledger where profile_id = p_profile;
  if v_balance < p_tickets then raise exception 'not_enough_tickets'; end if;

  select coalesce(max(tickets), 0) into v_current
  from public.ticket_draw_entries where draw_id = p_draw and profile_id = p_profile;
  if v_draw.max_tickets_per_player is not null and v_current + p_tickets > v_draw.max_tickets_per_player then
    raise exception 'over_limit';
  end if;

  insert into public.ticket_ledger (profile_id, amount, kind, reason, draw_id, created_by)
  values (p_profile, -p_tickets, 'draw_entry', left('Nevezés: ' || v_draw.title, 200), p_draw, p_profile);

  insert into public.ticket_draw_entries (draw_id, profile_id, tickets)
  values (p_draw, p_profile, p_tickets)
  on conflict (draw_id, profile_id)
  do update set tickets = public.ticket_draw_entries.tickets + excluded.tickets, updated_at = now();

  return v_current + p_tickets;
end;
$$;

-- Stores the result of a draw whose closing time has passed. The winners are picked by the
-- server (crypto-random, src/features/tickets/lib/draw.ts) from the entries it read; the
-- function checks that those entries are still exactly what is stored. Returns false when
-- another run already completed or cancelled the draw (safe to call twice).
create or replace function public.ticket_draw_complete(p_draw uuid, p_winners uuid[], p_total_tickets int)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_draw public.ticket_draws%rowtype;
  v_total int;
  v_entrants int;
  i int;
begin
  select * into v_draw from public.ticket_draws where id = p_draw for update;
  if not found then raise exception 'unknown_draw'; end if;
  if v_draw.status <> 'open' then return false; end if;
  if v_draw.closes_at > clock_timestamp() then raise exception 'draw_not_closed'; end if;

  select coalesce(sum(tickets), 0), count(*) into v_total, v_entrants
  from public.ticket_draw_entries where draw_id = p_draw;
  if v_total <> p_total_tickets then raise exception 'entries_changed'; end if;

  if coalesce(array_length(p_winners, 1), 0) <> least(v_draw.winner_count, v_entrants) then
    raise exception 'wrong_winner_count';
  end if;

  for i in 1 .. coalesce(array_length(p_winners, 1), 0) loop
    if not exists (select 1 from public.ticket_draw_entries where draw_id = p_draw and profile_id = p_winners[i]) then
      raise exception 'winner_not_entered';
    end if;
    insert into public.ticket_draw_winners (draw_id, place, profile_id) values (p_draw, i, p_winners[i]);
  end loop;

  update public.ticket_draws set status = 'drawn', drawn_at = now() where id = p_draw;
  return true;
end;
$$;

-- Admin closes a draw now (sets the closing time to the present), so the next step can draw it.
create or replace function public.ticket_draw_close_now(p_draw uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.ticket_draws set closes_at = least(closes_at, clock_timestamp())
  where id = p_draw and status = 'open';
  return found;
end;
$$;

-- Admin cancels an open draw: every entered ticket goes back to its owner.
create or replace function public.ticket_draw_cancel(p_draw uuid, p_by uuid)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_draw public.ticket_draws%rowtype;
  v_refunded int;
begin
  select * into v_draw from public.ticket_draws where id = p_draw for update;
  if not found then raise exception 'unknown_draw'; end if;
  if v_draw.status <> 'open' then raise exception 'draw_not_open'; end if;

  insert into public.ticket_ledger (profile_id, amount, kind, reason, draw_id, created_by)
  select profile_id, tickets, 'draw_refund', left('Visszatérítés (elmaradt sorsolás): ' || v_draw.title, 200), p_draw, p_by
  from public.ticket_draw_entries where draw_id = p_draw;
  get diagnostics v_refunded = row_count;

  update public.ticket_draws set status = 'cancelled' where id = p_draw;
  return v_refunded;
end;
$$;

-- Only the server may call these (the anon key is public).
revoke execute on function public.ticket_award(uuid, int, text, uuid) from public, anon, authenticated;
revoke execute on function public.ticket_draw_enter(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.ticket_draw_complete(uuid, uuid[], int) from public, anon, authenticated;
revoke execute on function public.ticket_draw_close_now(uuid) from public, anon, authenticated;
revoke execute on function public.ticket_draw_cancel(uuid, uuid) from public, anon, authenticated;
grant execute on function public.ticket_award(uuid, int, text, uuid) to service_role;
grant execute on function public.ticket_draw_enter(uuid, uuid, int) to service_role;
grant execute on function public.ticket_draw_complete(uuid, uuid[], int) to service_role;
grant execute on function public.ticket_draw_close_now(uuid) to service_role;
grant execute on function public.ticket_draw_cancel(uuid, uuid) to service_role;

commit;
