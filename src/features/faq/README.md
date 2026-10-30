# GYIK (site-wide)

| | |
|---|---|
| Folder | `src/features/faq/` |
| Branch | `feature/faq` |
| Route | `/gyik` (pages in `src/app/(site)/gyik/`) |
| Status | **preview**: built from the prototype; admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

General questions about the community, tournaments, tickets and the shop. The Meccsszervező keeps its own GYIK at `/meccsszervezo/gyik`.

## What's built

Page `src/app/(site)/gyik/`, content in `data/faq.ts` (prototype). In phase 1 `/gyik` sends the public to the Meccsszervező FAQ.

## Design

Prototype: `reference/artifact/index.html` → GYIK view (V1 `details` list).

## Data

Static content.

## Open questions (ask the owner before going live)

- Merge with the Meccsszervező GYIK, or link between the two?

## Folder layout

See [`../_template/README.md`](../_template/README.md).
