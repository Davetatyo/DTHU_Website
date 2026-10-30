# Versenynaptár

| | |
|---|---|
| Folder | `src/features/timetables/` |
| Branch | `feature/timetables` |
| Route | `/versenynaptar` (pages in `src/app/(site)/versenynaptar/`) |
| Status | **planned** (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

Tournament calendar: online rounds, live events (Asztali Nap), play-offs, ideas; tile view and month view, event details, calendar export.

## Design

Prototype: `reference/artifact/index.html` → Versenynaptár view (V2 tiles + V1 month calendar) and the phase timeline (`phases`).

## Data

Events with start/end, type (online / live / idea), place, description, tags. Online rounds can come from the Meccsszervező `rounds` table; live events need a new table.

## Open questions (ask the owner before building)

- Which events are entered by hand, and by whom (admins)?
- Should the Meccsszervező's round timeline and this calendar share one data source?

## Layout when built

See [`../_template/README.md`](../_template/README.md).
