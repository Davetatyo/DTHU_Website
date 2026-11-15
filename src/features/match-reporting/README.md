# Játszmák (match reporting, roadmap R17)

Players report their casual and ranked games on the website; the opponent confirms or corrects.
Every real game, including locked Bajnokságok results, ends up as one row in `games`: the only
source for stats now and the ranking later (R18). Discord `/result` (R19) will use the same
database functions.

**Plan and decisions:** [docs/r17-match-reporting-plan.md](../../../docs/r17-match-reporting-plan.md).
**Status:** in progress on `feature/match-reporting`. Steps 1–4 built (migration 0014, pure logic, tournament
bridge, pages + cron; approved by Árpád from screenshots 2026-11-15). Step 5 built 2026-11-15 (admin list,
edit / void, Játékosok split; not committed until Árpád approves the screenshots). Admins only
(`MATCH_REPORTING_ADMINS_ONLY` in `lib/access.ts`); opening it to players needs Árpád's OK.

## Routes (`routes.gameLog`, `gameNew`, `gameView`, `adminGames`)

- `/meccsszervezo/jatszmak`: Játszmáim: Elfogadásra vár (n), Elküldve, Lezárt (championship games too). The
  "Játszmák" tab shows the waiting count as a badge.
- `/meccsszervezo/jatszmak/uj`: report form (`components/GameForm.tsx`, from the reporter's side; HP sets the
  winner; warns and links when the two players still have an unplayed Bajnokságok match).
- `/meccsszervezo/jatszma/<id>`: one game: Elfogadom / Javítom (the same form, prefilled) / Visszavonom, and the
  history from `game_events`. Admins who didn't play it (or any admin once it is final) get an **Admin** box:
  Eredmény módosítása (the same form from side a's view + a required reason → `game_admin_edit`; a pending
  game becomes final) and Érvénytelenítés (required reason, confirm dialog → `game_void`). Tournament games
  only say where to change them (the Bajnokságok match). Shown in admin view only (`getAdminView`).
- `/meccsszervezo/admin/jatszmak`: Játszmák kezelése (admins): every game, filter Függőben / Végleges / Egyéb /
  Mind (`?allapot=`), latest 200; pending rows say how many days they wait (amber from day 3). Card on
  Admin felület with the pending count.

**Stats:** Játékosok, a player's page and the Profilom card read `games` through
`player-stats/lib/access.ts → statContexts()`: championships only, plus ranked and casual for viewers who can
use the Játszmák (so admins only until `MATCH_REPORTING_ADMINS_ONLY` is false). With those, a filter
Összes / Bajnokság / Ranked / Casual (`?tipus=`, counts on each tab) shows; Profilom shows the split counts.

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

## GYIK entry (draft, not published)

For the Meccsszervező GYIK (`src/app/meccsszervezo/gyik/page.tsx`), to add when the Játszmák open to players:

- **Hogyan rögzítsek egy bajnokságon kívüli játszmát?** A Játszmák fülön: „+ Új játszma”. Válaszd ki, casual
  vagy ranked volt-e, kivel játszottál, a hősöket, a megmaradt életerőt (ez a győztest is beállítja), ha
  szeretnéd az ultik számát, és mikor játszottatok. Az ellenfeled Discordon kap egy jelzést.
- **Mi a különbség a casual és a ranked között?** Mindkettő bekerül a statisztikádba. A ranked játszmák a
  későbbi ranglistába is beszámítanak, a casualok nem.
- **Az ellenfelem rossz eredményt küldött be. Mit tegyek?** Nyisd meg a játszmát, és válaszd a „Javítom”
  gombot: a javításod az ő jóváhagyására vár. Ha egyetértesz, „Elfogadom”: ezzel végleges lesz.
- **Mi lesz, ha az ellenfelem nem válaszol?** A 3. napon és a lejárat előtt 24 órával Discordon szólunk neki.
  7 nap után a játszma lejár, és nem számít bele semmibe (nem jár érte automatikus győzelem). Elakadt
  játszmánál szólj egy adminnak: ő le tudja zárni.
- **Elrontottam a beküldést.** Amíg az ellenfeled nem válaszolt, a játszma oldalán „Visszavonom”. Végleges
  játszmát csak admin tud javítani vagy érvényteleníteni, indoklással, amit mindketten láttok.
- **A bajnoki meccsemet is itt rögzítsem?** Nem: a bajnoki eredményt a bajnokság meccsoldalán add meg. Ha
  ugyanazzal a játékossal még van lejátszatlan bajnoki meccsed, az űrlap figyelmeztet és odavisz.

## Open questions

- Admins can edit or void **their own** game once it is final (only pending games are refused: `rights.ts`,
  `game_admin_edit` / `game_void`). Keep, or refuse own games always?
- Admin edits and voids don't ping the players on Discord (they see the reason in the history).

- While admins only, reminders still go to the public Időpontfoglaló channel (pinging admins).

- `game_events` retention: kept forever (default; volume is tiny).
