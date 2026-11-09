# Taktikai feladvány (puzzle experiment)

| | |
|---|---|
| Folder | `src/features/puzzle/` |
| Branch | `feature/puzzle` |
| Route | `/jatekok/taktikai-feladvany` (list), `/jatekok/taktikai-feladvany/<id>` (a puzzle); pages in `src/app/(site)/jatekok/taktikai-feladvany/` |
| Status | **Parked** (owner, 2026-11-09): only on branch `feature/puzzle`. **Experiment, admins only** (in admin view) until `PUZZLE_ADMINS_ONLY` in `lib/access.ts` is false. Card on the Játékok page, hidden from everyone else. On the local dev server (`npm run dev`) it opens without logging in (`PUZZLE_OPEN_IN_DEV`; with `NEXT_PUBLIC_FULL_SITE=1` in `.env.local` for the site gate). Roadmap R16 |
| Name | "Taktikai feladvány" is a working title (owner, 2026-11-09) |

## What it is

A Dice Throne puzzle: a fixed 1v1 board state at the **end of the attacker's Offensive Roll
Phase**. The dice are set (no more rolls). The player plays cards from the hand (CP, dice
changes, status removal), then picks one ability. The game works out the chance that this
attack wins, over **every possible outcome** of what follows: the Blind check, rolls inside
an ability (Overpower), the defender's defensive roll (Missed Me: all 7,776 rolls) and the
defender's Evasive tokens. The best possible line is found by a solver that tries every order
of card plays; a puzzle is solved when the player's line is as good as the best one.

Owner's decisions (2026-11-09):

1. Season 1 heroes first (the original Season 1 boards and cards from the
   `Dice_Throne_Card_Scanner` repo, `sources/S1`).
2. The offensive roll is fully preset.
3. The defence counts every possible outcome; the score is a percentage (100% = guaranteed).
4. No defender cards in the first version.
5. Only "find lethal" puzzles in the first version.
6. Cards are shown as their card images.
7. XP and DTHU coin rewards: options for admins later (not built).

## Files

- `lib/dice.ts`: dice faces per hero, symbol counts, straights, n-of-a-kind, all rolls.
- `lib/heroes.ts`: Barbarian and Moon Elf abilities, defences and every upgrade card, read off
  the Season 1 boards and cards. Status names as in the Szabálytár (Kábítás, Agyrázkódás, Vak,
  Gubanc, Célzott, Elkerülés).
- `lib/cards.ts`: the common deck + Barbarian + Moon Elf cards (cost, timing, image). Cards with
  `play` can be played in a puzzle: Six-It!, So Wild!, Twice As Wild!, Tip It!, Samesies!,
  Getting Paid!, Buh-Bye!. The rest show as "only in the main phase" or "doesn't help here".
- `lib/engine.ts`: playing cards (`applyMove`), which abilities the dice allow, and
  `resolveAttack` (win / tie / lose chances with Hungarian notes on why).
- `lib/solver.ts`: breadth-first search over every card play, best line overall and per ability.
- `lib/puzzles.ts`: the puzzles. Tests check each one has the intended 100% solution.
- `lib/text.ts`: Hungarian descriptions (with "a/az" and number suffixes).
- `components/PuzzleGame.tsx`: the game table (client side; everything runs in the browser,
  no database).
- `puzzle.css`: the table stays dark in both themes, like the other game stages.

Images (`public/jatekok/feladvany/`): card images, dice faces and the two Season 1 boards, 2.1 MB.
**Not committed** (owner, 2026-11-09: no card images on the site yet; the folder is in `.gitignore`).
Make them locally with `scripts/puzzle/assets.py` from the scanner repo (which is only read):

```bash
python3 -I scripts/puzzle/assets.py ../Dice_Throne_Card_Scanner
```

## Rules the engine uses (for the owner to confirm)

> **Wrong, per the owner (2026-11-09):** "Blind still makes an Ultimate fail". He played Rage! while
> Blind and got 66.7%; Blind does not stop an Ultimate, so it should be 100%. Fix first when this is
> picked up: in `resolveAttack`, skip the Blind check for an Ultimate, then redesign puzzle 1 (Rage!
> becomes a second 100% answer) and update its test.

- Stun inflicted before the damage (Crit Bash, Rage!) stops the defender's defensive roll and
  Evasive (Stun: "no actions of any kind").
- Ultimates can't be defended or evaded. Blind still makes an Ultimate fail on 1–2 (Blind
  fails the whole Offensive Roll Phase).
- Undefendable damage skips the defensive roll, but Evasive still works (Moon Elf leaflet FAQ).
- The defender spends Evasive only when the damage would be lethal (one roll per token,
  1–2 avoids all of it).
- Targeted adds 2 damage, also when the same attack inflicts it first.
- Only this attack counts: Stun's extra Offensive Roll Phase is not played out.
- A win needs the defender at 0 HP and the attacker above 0; both at 0 (Reckless recoil,
  Missed Me counter damage) is a tie.
- Buh-Bye! (instant) can remove your own Blind before the Offensive Roll Phase ends.

## Puzzle 1: "Vakon is látni"

Barbár (12 HP, 3 CP, **Vak**, Crit Bash II) vs Holdtündé (7 HP, 1 Elkerülés). Dice 6 6 1 6 4.
Hand: Six-It!, Samesies!, Buh-Bye!, Tip It!, Concuss!.

- Solution (100%): Buh-Bye! on yourself (Blind off), Six-It! on the 1 → 4 pow → Crit Bash II:
  Stun first, then 7 undefendable. (Samesies! instead of Six-It! works the same.)
- Trap: Six-It! + Samesies! → Rage! is 66.7% because Blind is still on and no CP is left.
- Overpower 22.5%, everything else 0%.

## Open questions

- The rules above (owner to confirm, especially Blind vs. Ultimate and Stun vs. Evasive).
- Hungarian names: Barbarian abilities use the names from the Hungarian cards in the scanner
  data (Pofon, Masszív csapás, Kritikus ütés…); "Düh!" for Rage! is a guess. Moon Elf abilities and
  all card names stay English (as printed on the card images).
- Rewards (XP, coins): what and when, set by admins.
- More goals later: defend, tie, maximise damage; defender cards; more heroes.
