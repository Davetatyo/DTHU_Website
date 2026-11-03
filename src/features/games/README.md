# Játékok

| | |
|---|---|
| Folder | `src/features/games/` |
| Branch | `feature/games` |
| Route | `/jatekok` (hub), `/jatekok/taktikai-elony`, `/jatekok/kockazat`, `/jatekok/szemfules`, `/jatekok/napi-kviz`, `/jatekok/szerencsekerek`; admin `/jatekok/admin`, `/jatekok/admin/kerdesek` (pages in `src/app/(site)/jatekok/`) |
| Status | **preview**: admins only until the full site opens. Roadmap: R6 (hub), R11 (Taktikai Előny), R12 (Kockázat), R13 (Szemfüles), R7 (Kvíz, parked) |

## What it is

The Játékok menu tab (after Bolt): a hub with one card per game (`lib/hub.ts`). Games:

- **Taktikai Előny** (live for admins): the Hadvezér (Tactician) guesses the Dice Throne hero
  the player thinks of, from yes/no answers. Owner decisions (2026-11-03): at most 10
  questions and 3 guesses; yes/no, plus a "Nem tudom" button (top right of the question card;
  tells him nothing and doesn't count towards the 10); logged-in players only; no saved games
  and no XP yet (XP later, with R4). No Season questions and no question that fits a single
  hero (those are filtered out in `lib/tactician-data.ts`). The stage is sized to the screen
  below the top bar and scrolled to the middle when the page opens and when a game starts.
- **Kockázat** (live for admins): dice poker against the Barbarian, who turns into your fan.
- **Szemfüles** (live for admins): spot the 10 differences in 60 seconds.
- **Napi kvíz** (live for admins; in the old Kvíz card's place): one question a day, the same
  for everyone; see "Daily games" below. The level-based Kvíz (roadmap R7) stays parked.
- **Szerencsekerék** (live for admins, next to the Napi kvíz): one free spin a day.

## Daily games (Napi kvíz, Szerencsekerék, sorozat)

Built from the owner's spec `DTHU_COINS_SPEC.md` (§2, §3.2–3.4, §4.2, §5), 2026-11-03. Casual
game reporting, tournaments, champion_zoom images, CSV import, community submissions and the
monitoring dashboard are **not built yet**.

- **Day:** Europe/Budapest, every day starts at 00:00 (`lib/daily.ts`: `budapestDay`,
  `nextDailyReset`, DST-safe). A daily card is normal until today's turn is used; then it turns
  grey ("Mára kész") with a countdown to the next 00:00 (`ResetCountdown`, refreshes at zero).
- **Spin:** server-side crypto-random from the spin table (`shop/lib/economy.ts` `pickSpin`);
  the wheel only animates to the slice the server names. Default table from the spec (EV ≈ 0.76).
  Players don't see the chances (owner: backend only); admins edit them. Slices show the coin
  amount with the DTHU coin icon. Once per day (unique key in the database).
- **Daily question:** `daily_question_for` fixes the day's question on first request: the one
  scheduled for that date, else (fallback on) the least recently used ready question, preferring
  the weekday's type. One answer per player per day; the correct answer and the explanation are
  only sent after answering (`lib/daily-data.ts`). Multiple choice (2–6) or free text matched
  ignoring case, spaces and accents (`isCorrectAnswer`). Reward: normal 1 / hard 2 or a
  per-question override. **Decision:** answers are unique per player and day, not per question,
  because reused bank questions must be answerable again on a later day.
- **Streaks (owner, 2026-11-03): two separate ones**, the spin and the quiz each count their own
  days in a row, 1..7. The 7th day shows 7/7 and pays +2 on top of that day's win (also when
  the win was 0); the next day starts a new round at 1; a missed day starts over
  (`daily_streak_touch` with `game`, `visibleStreak`). This replaces the spec's single streak
  that needed both games on the same day.
- **After playing:** the card is locked (not a link) and a direct visit goes to the Játékok page;
  the result shows once right after (`?eredmeny=1`). After a spin the page reloads for real
  into that view, because a soft refresh didn't redraw the header balance.
- **Admin** (`/jatekok/admin`, "Napi játékok kezelése"): next 14 days with a gap warning for the
  next 7, every setting (spin table with live sum and expected value, warning above
  `max_spin_ev`; rewards; streak; ticket price; fallback; weekday types), the audit log.
  `/jatekok/admin/kerdesek`: question bank with filters, schedule a question on a day (reuse
  included), archive; editor with live preview, duplicate warning, and answer-related fields
  locked once a question has answers.
- **Database:** migration `0010_daily_spin_and_question.sql` (needs 0009): `economy_config`,
  `audit_log` (a trigger refuses update/delete), `daily_spins`, `daily_questions`,
  `daily_question_days`, `daily_question_answers`, `daily_streaks`, new coin kinds `spin`,
  `daily_question`, `streak`. Settings default in code (`shop/lib/economy.ts`) until changed.
- Tests: `lib/daily.test.ts`, `lib/question-form.test.ts`, `shop/lib/economy.test.ts` (incl. a
  100 000-spin statistics check).

## Taktikai Előny

- `lib/tactician-traits.ts`: the questions and their "yes" heroes. Hand-written traits plus
  token and complexity questions filled from the Szabálytár (`lib/tactician-data.ts`, via
  `features/rulebook/lib/glossary.ts`). **The owner reviews this table.**
- `lib/tactician.ts`: every hero starts equally likely; each answer makes fitting heroes more
  likely and the rest less likely (a 10% chance of a wrong answer is allowed for); he asks the
  question that splits the remaining likelihood closest to half (randomly among near-equal
  ones), guesses at 70% certainty or when his questions run out.
- `lib/tactician.test.ts` plays every hero: always found with honest answers (6.4 questions on
  average, at most 8), usually found with one wrong answer; every two heroes differ on at least
  two questions.
- `components/TacticianGame.tsx` + `tactician.css`: intro (portrait, typed speech bubble),
  portrait melting into the full figure in the background, questions with a confidence bar,
  remarks, card-flip guess, endings, hero picker when he loses. Calmer for reduced motion.
- Pictures: `public/jatekok/hadvezer-portre.jpg`, `hadvezer-alak.jpg` (owner's high-res art,
  resized). The help vial is hidden on game pages (it covered the answer buttons on phones).

## Kockázat

- Owner decisions (2026-11-03): classic dice poker with Dice Throne names, 5 dice, 3 rolls,
  keep dice between rolls; the Barbarian plays his own turns but cheers for you; he asks how
  much time you have: short game (7 rounds, lower section) or full (13 rounds, 63 → +35 bonus);
  "Ultimate" = five of a kind (50); CSS 3D dice; no sound; logged-in players; no saving or XP.
- `lib/dice.ts` (+ tests): scoring, bonus, variants, `highlight()` for his cheering, and his
  play: `chooseHolds()` tries all 32 ways of keeping dice with random rolls, `chooseBox()`
  writes where the score beats what that box usually gives. `DISTRACTED` (30%) makes him take
  his second-best choice: he averages ~122 (short) / ~200 (full) points, beatable.
- `components/DiceGame.tsx` + `kockazat.css`: intro with the stern warrior and his typed
  greeting, cross-fade (with a flash) into the fan picture, the length question, the dice tray
  (CSS 3D cubes that tumble and hop; kept dice glow gold), the scorecard (your score in the
  box, his in the corner, previews to choose from), his animated turns, the ending.
- Scoreboard (owner's choice "A", 2026-11-03): a strip above the board with both totals in
  big numbers, the leader in gold (class `ahead`; `lead` is a site-wide class), a green dot
  for whose turn it is, and the round + "Te vezetsz +N" in the middle (with the "?").
- "Hogyan játssz?": three click-through cards (`HowToPlay` in `DiceGame.tsx`), from the intro
  link and the "?" in the scoreboard.
- 3D dice: each die keeps the same element between rolls (a new element wouldn't animate its
  turn) and its hop restarts by switching between two identical keyframes; the perspective
  sits on the die's own wrapper (`.kz-hop`), otherwise the cube renders flat. Which face shows
  is computed in `lib/dice-cube.ts`: the screen spin (rotateZ) must come first in the transform
  list, or the side faces 2–5 get swapped; `dice-cube.test.ts` checks every value at every
  spin with the same matrix maths as the browser.
- `components/stage.ts`: shared by both games (typed speech, vibration, sizing and centring
  the stage below the top bar).
- Pictures: `public/jatekok/barbar-harcos.jpg`, `barbar-rajongo.jpg`.

## Szemfüles

- Owner decisions (2026-11-03): +10 per difference, −5 per wrong tap, never below 0; 60 s;
  titles by share of the maximum (100% Szemfüles, 80% Sasszem, 60% Ügyeske, else
  Gratulálunk); pictures stacked on phones with forgiving taps; personal best kept in the
  browser (`localStorage`); no host character; logged-in players; no saving or XP.
- `lib/spot.ts` (+ tests): `PICTURES` (two images + the differences as shares of the
  picture's width/height and a label), `hitSpot()` (30% tolerance, a fingertip minimum),
  scoring and `title()`.
- `components/SpotGame.tsx` + `szemfules.css`: picture picker (with "Legjobb"), 3-2-1
  countdown (pictures blurred until "Rajt!"), the two pictures (gold rings drawn on both for a
  hit, red ✕ and −5 with a shake for a miss, double taps within 300 ms cost once), clock bar
  (red in the last 10 s), results with the title stamp, counting score, and the missed
  differences blinking in red.
- **Adding a picture:** put the two versions in `public/jatekok/szemfules/` and add an entry
  to `PICTURES`. To find the differences, compare the two images (pixel difference, blurred
  against JPEG noise) and confirm each with the owner: the second image of an AI-generated
  pair is redrawn everywhere, so not every changed pixel is a real difference. When the
  generator changed things by accident (Trick or Treat: a lit window, pumpkin faces), build
  the second image as the first one plus only the marked areas from the owner's version
  (feathered mask), then re-run the difference check: only the 10 should remain.
- Pictures: Tea Party, Trick or Treat, Black Friday Shopping, ARRRrrrrrrrrr (all 2000 × 1116). A pair with
  more than 10 differences: the owner picks one to drop, it is taken back from picture 1.

## Adding a game

Add a card to `lib/hub.ts`, its route to `src/lib/routes.ts`, a page under
`src/app/(site)/jatekok/<slug>/`, and a roadmap item.
