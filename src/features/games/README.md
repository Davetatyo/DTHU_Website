# Játékok

| | |
|---|---|
| Folder | `src/features/games/` |
| Branch | `feature/games` |
| Route | `/jatekok` (hub), `/jatekok/taktikai-elony` (pages in `src/app/(site)/jatekok/`) |
| Status | **preview**: admins only until the full site opens. Roadmap: R6 (hub), R11 (Taktikai Előny), R7 (Kvíz, parked) |

## What it is

The Játékok menu tab (after Bolt): a hub with one card per game (`lib/hub.ts`). Games:

- **Taktikai Előny** (live for admins): the Hadvezér (Tactician) guesses the Dice Throne hero
  the player thinks of, from yes/no answers. Owner decisions (2026-11-03): at most 10
  questions and 3 guesses; yes/no only; logged-in players only; no saved games and no XP yet
  (XP later, with R4).
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

## Adding a game

Add a card to `lib/hub.ts`, its route to `src/lib/routes.ts`, a page under
`src/app/(site)/jatekok/<slug>/`, and a roadmap item.
