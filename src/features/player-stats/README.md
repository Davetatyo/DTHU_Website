# Játékosok (player stats)

Every player's championship stats: overall record and win rate, per-hero records, match history,
opponent heroes and banned heroes. Players can open each other's stats (owner agreed 2026-11-13;
this replaces the 2026-11-03 "profiles stay private" rule **for stats only**; XP and level stay
private, see R4).

- **Routes:** `/meccsszervezo/jatekosok` (everyone, most games first), `/meccsszervezo/jatekos/<profile id>`
  (one player). Id-based so links survive Karnyx name changes. Never change these paths.
- **Entry points:** "Játékosok" tab in the Meccsszervező (before GYIK), a "Statisztikám" card on
  Profilom, and every player avatar and name that is not already inside a link (match page, Bajnokságok standings, participants, "Következő meccsem", admin sign-ups, Ranglista) through `components/PlayerLink.tsx`. Match rows and tiles stay links to the match.
- **Who sees it:** every logged-in player (`PLAYER_STATS_ADMINS_ONLY = false` in `lib/access.ts`,
  switched off 2026-11-13 at Árpád's request; `true` = admin view only). Logged-out visitors never do.
  Once merged, players get the Játékosok tab even while the Bajnokságok is still admin-only (pages
  show no games until results are confirmed). Discord and Facebook names are never shown.
- **Status:** branch `feature/player-stats` (from `feature/tournament-pairing`, needs its migration 0013).

## Data

No tables of its own, no migration. Computed on each page load (`lib/data.ts` → `lib/stats.ts`):

1. A profile's championships come from `tournament_registrations` (profile id + the Karnyx name it
   signed up with), matched to that tournament's `players` row. So results stay with the profile even
   if the player later renames.
2. Matches of those tournaments + **confirmed** `match_reports` only (`confirmed_at` set; admin reports
   are confirmed at once). Byes and unconfirmed results don't count.
3. The Karnyx league (Időpontfoglaló) is **not** counted: it records neither the winner nor the heroes.

Rules (`lib/stats.ts`, tested in `stats.test.ts`):
- Win rate = wins / games; a draw is a game, not a win.
- Matchups ("Ellenfél hősök") appear only after `MIN_MATCHUP_GAMES` (5) games against that hero.
- Bans = this player's heroes the opponents banned; the page shows the 5 most banned as hero portraits with the count on a badge.

## Open questions

- Finished championships are hidden from non-participants (championships README), but the match
  history on stats pages names the championship and opponent. Fine for the owner? (Not linked.)
- Cache table, if the number of games ever makes page loads slow (not needed at today's size).
- Ranglista could use these numbers instead of its sample data.
