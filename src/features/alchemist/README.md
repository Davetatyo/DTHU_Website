# Alkimista (help chat)

| | |
|---|---|
| Folder | `src/features/alchemist/` |
| Branch | `feature/alchemist` |
| Route | `/alkimista` (pages in `src/app/(site)/alkimista/`) |
| Status | **preview**: built from the prototype; admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

A rule-based helper (no AI): players ask in Hungarian and get a canned answer with a link to the right rule or page. Opens from a floating "?" vial that also pops up on the rulebook and FAQ pages.

## What's built

Page `src/app/(site)/alkimista/` with `components/Chat`; `components/HelpVial` (floating "?" on every full-site page, pops up when the Szabálytár or GYIK is opened). Matcher `lib/matcher.ts` and replies `lib/reply.ts` (both tested); answers in `data/knowledge.ts`. Unanswered questions are kept in the browser's localStorage for now (no admin inbox yet).

## Design

Prototype: `reference/artifact/index.html` → Alkimista view + help vial popup. The matcher (Hungarian stemming, synonyms, fuzzy matching) and all answers are in `reference/artifact/index.html` (AQ, SITE_INTENTS, amatch).

## Data

Static knowledge base (depends on `rulebook` content); optionally a table for questions it couldn't answer ("Kérdés beküldése az adminoknak").

## Open questions (ask the owner before going live)

- Keep it purely rule-based, or allow an AI fallback later?

## Folder layout

See [`../_template/README.md`](../_template/README.md).
