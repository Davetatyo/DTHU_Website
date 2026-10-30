# Alkimista (help chat)

| | |
|---|---|
| Folder | `src/features/alchemist/` |
| Branch | `feature/alchemist` |
| Route | `/alkimista` (pages in `src/app/(site)/alkimista/`) |
| Status | **planned** (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

A rule-based helper (no AI): players ask in Hungarian and get a canned answer with a link to the right rule or page. Opens from a floating "?" vial that also pops up on the rulebook and FAQ pages.

## Design

Prototype: `reference/artifact/index.html` → Alkimista view + help vial popup. The matcher (Hungarian stemming, synonyms, fuzzy matching) and all answers are in `reference/artifact/index.html` (AQ, SITE_INTENTS, amatch).

## Data

Static knowledge base (depends on `rulebook` content); optionally a table for questions it couldn't answer ("Kérdés beküldése az adminoknak").

## Open questions (ask the owner before building)

- Keep it purely rule-based, or allow an AI fallback later?

## Layout when built

See [`../_template/README.md`](../_template/README.md).
