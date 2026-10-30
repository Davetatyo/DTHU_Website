# Jegyek

| | |
|---|---|
| Folder | `src/features/tickets/` |
| Branch | `feature/tickets` |
| Route | `/jegyek` (pages in `src/app/(site)/jegyek/`) |
| Status | **preview**: built from the prototype; admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

Reward points ("jegyek") for taking part: played match, win, full tournament, live event, podium, helping organise. Shows the player's balance and history.

## What's built

Page `src/app/(site)/jegyek/`. Balance is SAMPLE data from the sample ranking; the earning rules (`data/earn.ts`) are the prototype's.

## Design

Prototype: `reference/artifact/index.html` → Jegyek view (V2 wallet tile + earning tiles).

## Data

A ticket ledger table (profile, amount, reason, date) and rules for awarding (automatic from match status, manual by admins).

## Open questions (ask the owner before going live)

- Exact earning rules and whether they are retroactive.
- Who can correct a balance.

## Folder layout

See [`../_template/README.md`](../_template/README.md).
