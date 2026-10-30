# Szabálytár

| | |
|---|---|
| Folder | `src/features/rulebook/` |
| Branch | `feature/rulebook` |
| Route | `/szabalytar` (pages in `src/app/(site)/szabalytar/`) |
| Status | **preview**: built from the prototype; admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

Dice Throne rules in Hungarian with search: quick reference, detailed rules (each with its own link), game modes, heroes, status effects, rules FAQ, index.

## What's built

Pages `src/app/(site)/szabalytar/` (search + tabs: quick reference, rules, game modes, heroes, tokens, rules FAQ, index; tab in `?tab=`) and `szabalytar/[id]` (one rule per page, copy-link button, previous/next). Content in `data/` (from the prototype), search and index in `lib/search.ts` (tested, including that every rule link points to an existing rule).

## Design

Prototype: `reference/artifact/index.html` → Szabálytár view (V1 + V2). The full content is in `reference/artifact/index.html` (RULES, RT_FAQ, RT_HEROES, RT_TOKENS): a summary of the Dice Throne Rulepop Hungarian fan translation.

## Data

Static content (TypeScript data or MDX files); no database.

## Open questions (ask the owner before going live)

- Permission/credit wording for the Rulepop translation.
- Per-hero pages: only with the translators' permission.

## Folder layout

See [`../_template/README.md`](../_template/README.md).
