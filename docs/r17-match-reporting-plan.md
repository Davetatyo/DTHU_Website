# R17 Meccs jelentése: agreed plan

**Status:** Steps 1–4 done on the branch (step 4: pages, report ping, reminders + expiry in the cron;
see the STATE.md handover log). Earlier: steps 1–3 (migration 0014 + Dave's guide, pure logic in
`src/features/match-reporting/lib/`, tournament bridge + profile-ID identity + stats from `games`, 2026-11-14); 0014 not run on the live database yet.
Agreed with Árpád 2026-11-14; Dave to confirm.
**Branch:** `feature/match-reporting` from `main`.
**Brief:** [website-match-reporting-and-unified-game-logic.md](website-match-reporting-and-unified-game-logic.md).
**Roadmap:** `Features_Roadmap.md` → R17. Followed by R18 (ranking) and R19 (Discord `/result`).

## Problem to fix first (not about Discord)

`players` (tournament entries) has **no `profile_id`**. A player's side of a match is found by
Karnyx name (`sideOf(match, profile.karnyx_name)` in `match-organizer/lib/play-mode.ts`), and
`player-stats/lib/data.ts` maps players to profiles through `tournament_registrations`
(tournament + Karnyx name at sign-up). Every profile has a Discord account; the gap is that the
tournament entry row stores a **name**, not the profile's ID. A player who edits their Karnyx name in
Profilom during a championship no longer matches their own entry and can't report or confirm that
match, and a later rename could even match someone else's old entry. Ranked games and ratings need
the permanent ID, so the first change is one column, `players.profile_id`, filled at the start.

**Identity rule (Árpád, 2026-11-14):** people are identified by their **profile ID** (`profiles.id`)
everywhere in R17: `games.profile_a/b`, `players.profile_id`, who reported and confirmed. New code never
uses the Karnyx name to decide who someone is; it is only shown as a display name. Karnyx is still used
for tournaments today and will be taken out completely later (roadmap R20); R17 must not add new
dependencies on it. Once `players.profile_id` exists, `sideOf()` and the Bajnokságok result actions
switch to comparing profile IDs (Karnyx-league rows without a profile keep the name check until R20).

## What exists (verified 2026-11-14)

- Bajnokságok results: `championships/lib/results.ts` (pure rules) and `actions/results.ts`.
  One player submits, the opponent confirms or corrects; sending the same result back counts as
  confirming; confirmation checks `submitted_at` so a changed report can't be confirmed. Draws
  are allowed; the winner can't finish on 0 HP. Admin reports lock at once.
- Gaps: no ultimates; locking a result is several separate writes (not a transaction); a correction
  overwrites the row (no history); heroes are a code list (`HERO_NAMES` in `src/lib/heroes.ts`).
- Pattern to follow: SQL functions with `security definer`, executable only by the service role
  (migrations 0008–0010), and the trigger that makes `audit_log` unchangeable (0010).
- Discord pings: `match-organizer/lib/discord.ts` (`mention()` = `<@discord_id>`, `postToDiscord()`
  through the webhook) and `lib/notify.ts`; the hourly `/api/cron/reminders` is triggered by
  Supabase `pg_cron` (docs/setup.md §6).

## Design: one games table, two ways in

- **`games`**: one row per real game; the only source for stats now and ratings later.
  `context` (casual / ranked / tournament), `rated` (fixed at creation), `source` (web / discord /
  admin), `status` (pending / finalized / cancelled / expired / voided), `profile_a`, `profile_b`,
  per side hero, HP, **ultimates (casual and ranked only, optional; null for tournament games)**,
  ban (tournament only), `outcome` (a / b / draw), `played_at`, reporter, confirmer, timestamps,
  `reminders_sent` (0, 1 or 2), and `match_id` (nullable, **unique**: a tournament match makes one game at most).
- **Standalone games** (casual, ranked): the report → confirm / correct lifecycle runs on `games`,
  same rules as the Bajnokságok.
- **Tournament games**: the existing `match_reports` flow stays as it is. When a result locks, it
  writes or updates its `games` row in the same transaction (`game_from_match`).
- **`game_events`**: append-only history (reported, corrected, confirmed, cancelled, expired,
  voided, admin edit with a reason), protected by a trigger like `audit_log`. R18 replays from it.
- **SQL functions** for every state change: `game_report`, `game_respond` (confirm or correct),
  `game_cancel`, `game_expire`, `game_void`, `game_from_match`. Each one checks, updates and writes
  history in one transaction, so a game is finalized exactly once. R19's bot API calls the same
  functions.
- **`players.profile_id`**: set from the registration when a championship starts; backfilled by
  the migration. Karnyx-league rows stay null.
- **`tournaments.rated`** (default true). Ranked games: rated; casual: never; tournament games:
  the tournament's setting.
- **No rating calculation in R17.** R18 consumes finalized `rated` games.

## Decisions (Árpád, 2026-11-14)

1. **Ultimates:** recorded only for ranked and casual games, optional. Bajnokságok never record
   them (the result panel stays unchanged).
2. **Report ping (Árpád, 2026-11-15):** reporting or correcting a game pings the player who has to answer
   right away, in the same channel.
3. **Unanswered reports:** expire after **7 days** with no effect (never an automatic win). The
   player who has to answer gets **two Discord pings** in the Időpontfoglaló's channel (same webhook,
   `postToDiscord` + `mention()`), each with "x nap / óra maradt a játszma jóváhagyására" and a link
   to the game's page:
   - **day 3** (72 h after the report or the last correction);
   - **last call 24 hours before the game expires** (144 h), only if it is still pending.
   Built on the hourly cron: `reminders_sent` (0 → 1 → 2) makes each ping go out once; pending games
   older than 7 days are expired (`game_expire`). A correction restarts the 7 days and the pings for
   the player who now has to answer.
4. **Disputes:** "Javítom" works like the Bajnokságok: the corrected version goes back to the first
   player to confirm; an admin settles stuck games.
5. **Backdating:** `played_at` at most 7 days in the past, never in the future.
6. **Visibility:** pending games only to the two players and admins; finalized games to every
   logged-in player (like the stats).
7. **Release:** admins only first (`MATCH_REPORTING_ADMINS_ONLY`), then players.

Earlier (same day): standalone Ranked games exist; tournament matches count as ranked for both
skill rating and seasonal LP (R18); no Karnyx history import.

## Screens (in the Meccsszervező)

- `/meccsszervezo/jatszmak`: **Játszmáim**, my games + the **Elfogadásra vár (n)** inbox; badge on
  the tab.
- `/meccsszervezo/jatszmak/uj`: report form. Casual / Ranked, opponent from registered players (no
  self, no banned profiles), both heroes from `HERO_NAMES`, HP, optional ultimates, outcome, date.
- `/meccsszervezo/jatszma/<id>`: one game. Elfogadom / Javítom; Visszavonom (reporter, while pending).
- "Játszma" = a game outside tournaments; "meccs" stays the tournament fixture.
- If the two players have an unplayed Bajnokságok fixture, the form warns them and links to it.
- Játékosok and Profilom read from `games`, split Casual / Ranked / Bajnokság / Összes.
- Admin: list games, void or edit with a required reason.
- New routes go in `src/lib/routes.ts`; Hungarian UI, `SubmitButton` everywhere, 375 px first.

## Build order

1. **Migration 0014** (incl. `players.profile_id`) + Dave's guide `docs/migrations/0014-games-for-dave.md`. Additive only;
   backfills `players.profile_id` and copies existing locked tournament results into `games`
   (the live `match_reports` was empty on 2026-11-14).
2. **Pure logic + tests**: report validation (ultimates only for casual/ranked), rights per status,
   reminder/expiry timing (day-3 ping, 24-hours-left ping, expiry), shared outcome/HP rules moved out of `championships/lib/results.ts`
   (which then uses them).
3. **Tournament bridge + stats switch + side by profile ID** (`sideOf` and the Bajnokságok actions compare profile IDs): locking a Bajnokságok result calls `game_from_match`;
   Játékosok reads `games` and shows the same numbers as before (safe first push, nobody notices).
4. **Report form, inbox, game page**, admins only. Day-3 and 24-hours-left Discord pings + day-7 expiry in the cron.
5. **Admin void/edit**, then open to players.

## Open (decide while building)

- `game_events` retention: keep forever (default; volume is tiny).
