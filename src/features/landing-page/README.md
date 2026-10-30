# Hírek (home)

| | |
|---|---|
| Folder | `src/features/landing-page/` |
| Branch | `feature/landing-page` |
| Route | `/` (pages in `src/app/(site)/page.tsx`) |
| Status | **in-progress** (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

The site's front page: the current tournament as a banner (like the Meccsszervező overview), news cards, today's matches, a short power ranking and tiles to tickets/shop.

## Design

Prototype: `reference/artifact/index.html` → Hírek view (V3): `hero3` banner, `news4` cards, schedule rows, power-ranking side panel.

## Data

News items (title, date, category, image, link). Reuses the Meccsszervező data for the banner and today's matches, and `rankings` for the side panel.

## Open questions (ask the owner before building)

- Where does news come from: a `news` table edited on an admin page, or pulled from Discord/Facebook?
- Which blocks are needed for launch, and which can wait for other features?

## Layout when built

See [`../_template/README.md`](../_template/README.md).
