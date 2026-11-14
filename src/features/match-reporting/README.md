# Játszmák (match reporting, roadmap R17)

Players report their casual and ranked games on the website; the opponent confirms or corrects.
Every real game, including locked Bajnokságok results, ends up as one row in `games`: the only
source for stats now and the ranking later (R18). Discord `/result` (R19) will use the same
database functions.

**Plan and decisions:** [docs/r17-match-reporting-plan.md](../../../docs/r17-match-reporting-plan.md).
**Status:** in progress on `feature/match-reporting`. Steps 1–3 done (migration 0014, pure logic in
this folder's `lib/`, tournament bridge); no pages yet. Admins only first (`MATCH_REPORTING_ADMINS_ONLY`, to add
in step 4).

## Routes (step 4, not built)

- `/meccsszervezo/jatszmak`: Játszmáim + Elfogadásra vár (n)
- `/meccsszervezo/jatszmak/uj`: report form
- `/meccsszervezo/jatszma/<id>`: one game (Elfogadom / Javítom / Visszavonom; admin edit / void)

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

The database functions check the same rules again; keep both sides in step.

## Open questions

- `game_events` retention: kept forever (default; volume is tiny).
