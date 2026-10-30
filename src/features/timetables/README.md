# Versenynaptár

| | |
|---|---|
| Folder | `src/features/timetables/` |
| Branch | `feature/timetables` |
| Route | `/versenynaptar` (pages in `src/app/(site)/versenynaptar/`) |
| Status | **preview**: built from the prototype; admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md) |

## What it is

Tournament calendar: online rounds, live events (Asztali Nap), play-offs, ideas; tile view and month view, event details, calendar export.

## What's built

Page `src/app/(site)/versenynaptar/`; `components/EventsView` (tiles / month calendar, choice remembered in the browser, event dialog) and `components/SeasonPhases` (the season timeline under the header of every full-site page). Events and the season plan are sample data (`data/events.ts`); the month view also shows the real confirmed Meccsszervező matches.

## Design

Prototype: `reference/artifact/index.html` → Versenynaptár view (V2 tiles + V1 month calendar) and the phase timeline (`phases`).

## Data

Events with start/end, type (online / live / idea), place, description, tags. Online rounds can come from the Meccsszervező `rounds` table; live events need a new table.

## Open questions (ask the owner before going live)

- Which events are entered by hand, and by whom (admins)?
- Should the Meccsszervező's round timeline and this calendar share one data source?

## Folder layout

See [`../_template/README.md`](../_template/README.md).
