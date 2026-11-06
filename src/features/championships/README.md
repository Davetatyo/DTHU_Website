# Bajnokságok (championships)

DTHU's own tournament platform (the owner's words: "our personal Karnyx"). Tournaments are
hosted here from now on: sign-up with heroes, automatic pairing, time agreement, results and
standings. When it launches it replaces the Időpontfoglaló (`/meccsszervezo`), which stays
exactly as it is until then; there will be no Karnyx-league data in Bajnokságok.

- **Routes:** `/bajnoksagok` (Áttekintés: opens the viewer's own championship),
  `/bajnoksagok/osszes` (Összes bajnokság), `/bajnoksagok/<slug>` (one championship),
  `/bajnoksagok/admin` and `/bajnoksagok/admin/<slug>` (Kezelés, admins). The sub-tabs are
  `components/ChampionshipTabs.tsx`; slugs in `RESERVED_SLUGS` (`lib/access.ts`) can't be used.
- **Status:** preview (admins only in phase 1). Branch `feature/tournament-pairing`.
- **Migration:** `supabase/migrations/0012_championships.sql` (the owner runs it before deploy).

## Who sees what (`lib/access.ts`)

| Championship | Player in it | Everyone else |
|---|---|---|
| Registration open | their entry: change heroes, lock in, leave | sign-up list, can join |
| Running | full view: own match, time agreement, result panel | read-only rounds, pairings, standings |
| Finished | read-only results | **hidden** (admins: read-only). Owner: only the players need it later, to look back at their games against specific opponents |
| Draft | admins only | — |

## How it works

1. An admin creates a championship (Swiss, Bo1, rounds, round length, start time, auto pairing),
   as a draft or with registration open.
2. Players join with **3 different heroes**, can change them until the start and can lock in.
   Picks are **secret until the start**: `tournament_registrations` has RLS on and no read
   policy; only the server reads it.
3. **Start** (at `starts_at`, or "Indítás most"): every registration becomes a `players` row,
   locked or not; with auto pairing round 1 is paired at once. The start runs on the first page
   open after `starts_at` (the page then redirects to itself, because Next.js reuses identical
   reads within one render); the hourly cron (`api/cron/reminders`) is the backstop. A status
   claim makes it run once.
4. The overview looks like the Időpontfoglaló's: round header, round timeline, pairings as a
   list or cards (`components/ChampionshipMatches.tsx`, with scores, picks and bans), the
   viewer's own match with **Időpont egyeztetés** (for now the Időpontfoglaló's match page,
   `routes.match`) and **Eredmény beküldése**, the round's progress, earlier rounds, standings.
5. **Results** (like Karnyx's panel, `components/ResultPanel.tsx`): winner or draw, each player's
   played and banned hero (from their 3), final health. One player submits, the opponent
   confirms; if they disagree they correct it and the correction waits for the first player
   (sending the same result again also confirms). Confirmed = locked; only admins can change
   it, and an admin's entry locks at once. A player who is also an admin reports their own match
   like a player until it's locked. Rules: `lib/results.ts`; server: `actions/results.ts`.
6. A round is finished when every match has a locked result ("Lejátszottuk" alone doesn't
   count). With auto pairing the next Swiss round starts then; after the last round the
   championship is finished. Win 1 point, draw ½, Bye 1. Bo1 only for now.

## Data

A championship is a `tournaments` row with `format` ≠ `manual` and `is_active = false`, so the
Időpontfoglaló (which reads the active tournament) never shows it. Its players, rounds, matches
and time proposals use the Időpontfoglaló's tables, which is what lets the Időpontfoglaló's
match page work for them. Migration 0012 adds `format`, `best_of`, `settings`, `slug`,
`status`, `starts_at`, `auto_pairing` (tournaments), `winner_id`, `is_draw` (matches), and the
tables `match_reports` (public read) and `tournament_registrations` (no read policy).

## Code

- `lib/engine/`: pure pairing engine with property tests. Swiss is wired to the site; round robin,
  single/double elimination and groups are ready but not wired (they show as "hamarosan"), and
  would need their own migration for bracket links.
- `lib/rules.ts` (hero picks, start, next step, standings), `lib/results.ts` (result reports),
  `lib/access.ts` (visibility): pure, tested next to each file.
- `lib/run.ts`: server side (reads, start, round creation, auto-advance). `lib/notify.ts`: the
  Discord post for a new round.
- `actions/admin.ts` (admins), `actions/entry.ts` (sign-up), `actions/results.ts` (results).
- The Eseménynaptár shows championships (`features/timetables/lib/tournament-items.ts`).

## Next steps (agreed with the owner, 2026-11-06)

1. Own match page `/bajnoksagok/meccs/<id>`: time proposals and the result panel, so nothing
   links to the Időpontfoglaló any more; result buttons for admins on every match there.
2. Közelgő meccsek, calendar feed and reminders for championships. Today the Időpontfoglaló's
   48-hour deadline warning also covers championship rounds and links to its overview.
3. Launch: Bajnokságok public, the Időpontfoglaló tab removed, its old links redirected.

## Open questions

- Unconfirmed results: nothing auto-confirms or reminds; an admin settles a stuck match.
- An admin changing a locked result after the next round was paired doesn't re-pair that round.
- "Lejátszottuk" on the Időpontfoglaló's match page marks a championship match played without a
  result; it then lists as finished with no score until a result is entered (goes away with
  step 1).
