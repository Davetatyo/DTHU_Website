# Ranglista / Power Ranking

| | |
|---|---|
| Folder | `src/features/rankings/` |
| Branch | `feature/rankings` |
| Route | `/ranglista` (pages in `src/app/(site)/ranglista/`) |
| Status | **planned** (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

Season standings: points, win–loss record, favourite hero, weekly movement, podium.

## Design

Prototype: `reference/artifact/index.html` → Ranglista view (V3 `pr-big` rows + leader tile); the V2 podium is an alternative.

## Data

Results per match. The Meccsszervező doesn't store results (they stay in Karnyx), so this needs either manual result entry, an import from Karnyx copy-paste (like pairings), or results typed in when marking a match played.

## Open questions (ask the owner before building)

- Source of truth for results and points (Karnyx stays official?).
- Point rules (win 3, draw/timeout 1 in the prototype) and season boundaries.

## Layout when built

See [`../_template/README.md`](../_template/README.md).
