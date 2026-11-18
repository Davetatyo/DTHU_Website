# Hős segédlet (hero guide)

| | |
|---|---|
| Folder | `src/features/hero-guide/` |
| Branch | `feature/hero-guide` |
| Route | `/meccsszervezo/meccs/<id>/hos-segedlet` |
| Status | **Live** for everyone logged in since v2.41 (2026-11-18); `HERO_GUIDE_ADMINS_ONLY` in `lib/hero-guide.ts` turns admins-only back on |

## What it is

Anyone logged in can read up on the heroes in a match. An orange button next to Lejátszottuk on the
match page opens a page where you pick a player (your opponent comes first), pick one of their
heroes, and read that hero's Szabálytár entry: board and leaflet, tokens, setup, rule clarifications.
Layout agreed with the owner from a mockup, 2026-11-05.

## Rules (`lib/hero-guide.ts`)

Owner's decision, 2026-11-05:

- Every match with an opponent, whatever its state: a hero roster doesn't depend on the time, so it's
  there before the time is agreed and stays after the match is played. A Bye has none.
- Everyone logged in, whether or not they play in the match. Others opening the address go to the
  match page.
- Admins only during the test phase; opened to everyone logged in on 2026-11-18 (owner, after a
  player asked for it).

## How it works

The page renders both players' hero entries on the server (`rulebook/lib/content.ts`), and
`HeroGuide` switches between them without a reload. It reuses the Szabálytár's `EntryView`,
`RulebookViewer` and `SpriteSheet`, so token and rule links open as popups. No database table.

A roster name becomes a Szabálytár id by `heroIdFromName`. A name that matches no hero shows a short
note instead of an entry. On 2026-11-05 all 28 hero names in the tournament matched.

## Known limits

- Players see Roxley's boards and leaflets here (the owner opened it on 2026-11-18 knowing that).
- The GYIK entry is in `app/meccsszervezo/gyik/page.tsx` ("Lejátszás és eredmény"); keep it in line.
- The Szabálytár's own pages stay closed to players in phase 1. Popups work, but while one is open the
  address bar shows its `/szabalytar/…` link, and reloading there or opening it elsewhere redirects.
