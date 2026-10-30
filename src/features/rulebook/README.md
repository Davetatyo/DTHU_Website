# Szabálytár

| | |
|---|---|
| Folder | `src/features/rulebook/` |
| Branch | `feature/rulebook` |
| Route | `/szabalytar` (pages in `src/app/(site)/szabalytar/`) |
| Status | **planned** (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

Dice Throne rules in Hungarian with search: quick reference, detailed rules (each with its own link), game modes, heroes, status effects, rules FAQ, index.

## Design

Prototype: `reference/artifact/index.html` → Szabálytár view (V1 + V2). The full content is in `reference/artifact/index.html` (RULES, RT_FAQ, RT_HEROES, RT_TOKENS): a summary of the Dice Throne Rulepop Hungarian fan translation.

## Data

Static content (TypeScript data or MDX files); no database.

## Open questions (ask the owner before building)

- Permission/credit wording for the Rulepop translation.
- Per-hero pages: only with the translators' permission.

## Layout when built

See [`../_template/README.md`](../_template/README.md).
