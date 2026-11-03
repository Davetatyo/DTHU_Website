# Játékok

| | |
|---|---|
| Folder | `src/features/games/` |
| Branch | `feature/games` |
| Route | `/jatekok` (hub), `/jatekok/taktikai-elony`, `/jatekok/kockazat`, `/jatekok/szemfules` (pages in `src/app/(site)/jatekok/`) |
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
- **Kvíz**: parked, shown as "Hamarosan".

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
  pair is redrawn everywhere, so not every changed pixel is a real difference.

## Adding a game

Add a card to `lib/hub.ts`, its route to `src/lib/routes.ts`, a page under
`src/app/(site)/jatekok/<slug>/`, and a roadmap item.
