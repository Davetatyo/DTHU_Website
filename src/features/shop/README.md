# Bolt

| | |
|---|---|
| Folder | `src/features/shop/` |
| Branch | `feature/shop` |
| Route | `/bolt` (pages in `src/app/(site)/bolt/`) |
| Status | **preview**: built from the prototype; admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

The shop of the site, paid in **DTHU coin** (the shop currency, icon `src/components/DthuCoin.tsx`).
For now it sells one thing (owner, 2026-11-03): a **Sorsolás ticket for 3500 DTHU coins**
(`lib/catalog.ts`, `TICKET_PRICE`). Bought tickets land on the player's ticket balance and can be
entered into draws on `/sorsolas` (feature `tickets`).

## What's built

- `/bolt`: the player's coin and ticket balances (no history: admins only) and the ticket offer
  with a quantity field (at most what they can afford, max 100 per purchase).
- `/bolt/admin` (admins): give or take DTHU coins with a reason, balances, recent coin ledger.
  For now this is the **only way to get coins**; how players earn them is still to be described.
- Database: `supabase/migrations/0009_dthu_coins.sql` (needs 0008): `coin_ledger` (balance = sum,
  never edited), `coin_award`, `shop_buy_tickets` (takes the coins and adds the tickets in one
  step; refuses when the balance is too low, banned players can't buy). It also lets
  `ticket_ledger` record `shop_purchase` rows.
- The prototype's sample items and the "Érdekel" wishlist were removed.

## Design

Prototype: `reference/artifact/index.html` → Bolt view (tiles with price badges). The coin is
our own design: gold, ridged rim, the DTHU die embossed, full colour in both themes.

## Open questions (ask the owner)

- How players earn DTHU coins (matches, placements, events, daily login?).
- Should coins show elsewhere too (header, profile, Sorsolás page)?
- More items later (the prototype had a Discord rank, profile frame, entry discount, dice set).

## Folder layout

See [`../_template/README.md`](../_template/README.md).
