# Bolt

| | |
|---|---|
| Folder | `src/features/shop/` |
| Branch | `feature/shop` |
| Route | `/bolt` (pages in `src/app/(site)/bolt/`) |
| Status | **planned** (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

Spend tickets on rewards (Discord rank, profile frame, raffle, entry discount, dice set, first pick). Until it opens: an "Érdekel" wishlist to measure interest.

## Design

Prototype: `reference/artifact/index.html` → Bolt view (V2 tiles with price badges, wishlist).

## Data

Shop items, wishlist entries, later redemptions (depends on `tickets`).

## Open questions (ask the owner before building)

- Which rewards are real and who fulfils them.
- Wishlist first (no ticket spending) as a first release?

## Layout when built

See [`../_template/README.md`](../_template/README.md).
