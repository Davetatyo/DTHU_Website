-- 0009 · DTHU coin: the shop currency, and buying Sorsolás tickets with it in the Bolt.
-- Run: Supabase Dashboard → SQL Editor → paste the whole file → Run, BEFORE deploying the code
-- that needs it. Needs 0008 (ticket draws) first: it lets the ticket ledger record shop purchases.
-- Only adds things (one table, two functions, one more allowed ticket kind) and no data.
-- Safe to run twice. Runs in one transaction: if anything fails, nothing is created.
--
-- Model:
--   coin_ledger  every change to a player's DTHU coin balance (+ awards, − shop purchases).
--                Balance = sum(amount). Rows are never updated or deleted.
--   A ticket bought in the shop is one coin_ledger row (− price) and one ticket_ledger row
--   (+ tickets, kind 'shop_purchase'), written together by shop_buy_tickets.

begin;

create table if not exists public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount <> 0 and amount between -10000000 and 10000000),
  kind text not null check (kind in ('award', 'shop_purchase')),
  reason text not null check (char_length(reason) between 1 and 200),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists coin_ledger_profile_idx on public.coin_ledger (profile_id, created_at desc);

-- Like the other newer tables: row level security on and no policies (server-only access).
alter table public.coin_ledger enable row level security;

-- Tickets can now also come from the shop.
alter table public.ticket_ledger drop constraint if exists ticket_ledger_kind_check;
alter table public.ticket_ledger add constraint ticket_ledger_kind_check
  check (kind in ('award', 'draw_entry', 'draw_refund', 'shop_purchase'));

-- Admin gives (or, with a negative amount, takes back) coins. Refuses to go below zero.
create or replace function public.coin_award(p_profile uuid, p_amount int, p_reason text, p_by uuid)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_amount = 0 then raise exception 'zero_amount'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'missing_reason'; end if;
  -- One balance change per player at a time (the same lock the ticket functions take).
  perform 1 from public.profiles where id = p_profile for update;
  if not found then raise exception 'unknown_profile'; end if;

  select coalesce(sum(amount), 0) into v_balance from public.coin_ledger where profile_id = p_profile;
  if v_balance + p_amount < 0 then raise exception 'not_enough_coins'; end if;

  insert into public.coin_ledger (profile_id, amount, kind, reason, created_by)
  values (p_profile, p_amount, 'award', left(trim(p_reason), 200), p_by);
  return v_balance + p_amount;
end;
$$;

-- A player buys p_quantity Sorsolás tickets at p_unit_price coins each (the price comes from the
-- server's catalogue, src/features/shop/lib/catalog.ts). Banned players can't buy.
-- Returns the player's new coin balance.
create or replace function public.shop_buy_tickets(p_profile uuid, p_quantity int, p_unit_price int)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_balance int;
  v_cost int;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then raise exception 'invalid_quantity'; end if;
  if p_unit_price is null or p_unit_price < 1 then raise exception 'invalid_price'; end if;
  v_cost := p_quantity * p_unit_price;

  perform 1 from public.profiles where id = p_profile and banned_at is null for update;
  if not found then raise exception 'unknown_profile'; end if;

  select coalesce(sum(amount), 0) into v_balance from public.coin_ledger where profile_id = p_profile;
  if v_balance < v_cost then raise exception 'not_enough_coins'; end if;

  insert into public.coin_ledger (profile_id, amount, kind, reason, created_by)
  values (p_profile, -v_cost, 'shop_purchase', 'Bolt: ' || p_quantity || ' sorsolási jegy', p_profile);
  insert into public.ticket_ledger (profile_id, amount, kind, reason, created_by)
  values (p_profile, p_quantity, 'shop_purchase', 'Vásárlás a boltban (' || v_cost || ' DTHU coin)', p_profile);
  return v_balance - v_cost;
end;
$$;

-- Only the server may call these (the anon key is public).
revoke execute on function public.coin_award(uuid, int, text, uuid) from public, anon, authenticated;
revoke execute on function public.shop_buy_tickets(uuid, int, int) from public, anon, authenticated;
grant execute on function public.coin_award(uuid, int, text, uuid) to service_role;
grant execute on function public.shop_buy_tickets(uuid, int, int) to service_role;

commit;
