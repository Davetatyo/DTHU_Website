# Játszmák (match reporting, roadmap R17)

Players report their casual and ranked games on the website; the opponent confirms or corrects.
Every real game, including locked Bajnokságok results, ends up as one row in `games`: the only
source for stats now and the ranking later (R18). Discord `/result` (R19) will use the same
database functions.

**Plan and decisions:** [docs/r17-match-reporting-plan.md](../../../docs/r17-match-reporting-plan.md).
**Status:** in progress on `feature/match-reporting`. Steps 1–4 built (migration 0014, pure logic, tournament
bridge, pages + cron; approved by Árpád from screenshots 2026-11-15). Admins only
(`MATCH_REPORTING_ADMINS_ONLY` in `lib/access.ts`). Step 5 (admin void / edit pages, open to players) is next.

## Routes (`routes.gameLog`, `gameNew`, `gameView`)

- `/meccsszervezo/jatszmak`: Játszmáim: Elfogadásra vár (n), Elküldve, Lezárt (championship games too). The
  "Játszmák" tab shows the waiting count as a badge.
- `/meccsszervezo/jatszmak/uj`: report form (`components/GameForm.tsx`, from the reporter's side; HP sets the
  winner; warns and links when the two players still have an unplayed Bajnokságok match).
- `/meccsszervezo/jatszma/<id>`: one game: Elfogadom / Javítom (the same form, prefilled) / Visszavonom, and the
  history from `game_events`. Admin edit / void: step 5 (the SQL functions exist).

Server actions: `actions/games.ts` (all writes through `game_*` functions). Reporting or correcting pings the
player who has to answer in the Időpontfoglaló's Discord channel (`reportLine`; never blocks the save). Cron: `lib/cron.ts`, called from
`/api/cron/reminders`: expires 7-day-old reports, pings on day 3 and 24 hours before expiry (claimed first,
so a ping goes out once; a correction resets the clock).

**React 19 gotcha:** a form with `action` is reset after the action runs. `GameForm` keeps every field
controlled and remounts the `<form>` by the error's timestamp (`FormState.at`), or the type switch falls back
to Casual and the heroes clear after a validation error.

## Data (migration 0014)

- `games`: see the migration's comments. Side a = the reporter for standalone games, = `player_a_id`
  for championship games. Never written directly: every change goes through a `game_*` function.
- `game_events`: append-only history (the trigger refuses edits).
- `players.profile_id`: the account behind a tournament player. People are identified by profile ID
  only; Karnyx names are display-only (R20 removes them).

## Rules (`lib/`)

| File | What |
|---|---|
| `src/lib/game-result.ts` | Outcome + health (shared with `championships/lib/results.ts`) |
| `report.ts` | Form checks: heroes from `HERO_NAMES`, optional ultimates 0–20, date at most 7 days before the first report and not in the future; `sameResult` (sending the same back confirms) |
| `rights.ts` | Who sees and does what. Final games: every logged-in player; others: the two players and admins. A player of the game acts as a player while it is pending, even an admin |
| `timing.ts` | Day-3 ping, last call 24 hours before expiry, expiry after 7 days, from `reported_at` (a correction resets it) |
| `errors.ts` | Database error codes → Hungarian text |
| `form.ts` | Form fields from the viewer's side (my / opponent) ↔ sides a / b |
| `labels.ts` | Status, context and history texts |
| `messages.ts` | Discord reminder line |

The database functions check the same rules again; keep both sides in step.

## Open questions

- While admins only, reminders still go to the public Időpontfoglaló channel (pinging admins).

- `game_events` retention: kept forever (default; volume is tiny).
