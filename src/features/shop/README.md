# Bolt

| | |
|---|---|
| Folder | `src/features/shop/` |
| Branch | `feature/shop` |
| Route | `/bolt` (pages in `src/app/(site)/bolt/`) |
| Status | **preview**: built from the prototype; admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

Spend tickets on rewards (Discord rank, profile frame, raffle, entry discount, dice set, first pick). Until it opens: an "Érdekel" wishlist to measure interest.

## What's built

Page `src/app/(site)/bolt/`; `components/ShopGrid` with the "Érdekel" wishlist (kept in the browser's localStorage, not shared yet). Items: `data/items.ts`.

## Design

Prototype: `reference/artifact/index.html` → Bolt view (V2 tiles with price badges, wishlist).

## Data

Shop items, wishlist entries, later redemptions (depends on `tickets`).

## Open questions (ask the owner before going live)

- Which rewards are real and who fulfils them.
- Wishlist first (no ticket spending) as a first release?

## Folder layout

See [`../_template/README.md`](../_template/README.md).
