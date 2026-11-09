// The puzzles. Each one is a board state at the end of the attacker's Offensive Roll Phase.
// The solver (lib/solver.ts) checks every puzzle in the tests: its best line must be the
// intended solution. Rewards (XP, DTHU coin) are set by admins later (owner, 2026-11-09).

import type { PuzzleState } from "./engine";

export type Goal = "lethal";

export type Puzzle = {
  id: string;
  title: string;
  goal: Goal;
  /** The task, in Hungarian. */
  brief: string;
  state: PuzzleState;
  /** Shown after solving: why this is the answer. */
  explanation: string;
};

export const GOAL_HU: Record<Goal, string> = {
  lethal: "Találd meg a halálos támadást",
};

export const PUZZLES: Puzzle[] = [
  {
    id: "1",
    title: "Vakon is látni",
    goal: "lethal",
    brief:
      "A Barbár vagy. Az utolsó dobásod után ezek a kockák maradtak. Játssz ki lapokat a kezedből, majd válassz képességet: " +
      "nyerd meg a meccset ezzel a támadással a lehető legbiztosabban.",
    state: {
      attacker: { hero: "barbarian", hp: 12, cp: 3, statuses: { blind: 1 }, upgrades: ["crit-bash-ii"] },
      defender: { hero: "moon-elf", hp: 7, cp: 4, statuses: { evasive: 1 }, upgrades: [] },
      dice: [6, 6, 1, 6, 4],
      hand: ["six-it", "samesies", "buh-bye", "tip-it", "concuss"],
    },
    explanation:
      "A Düh! (Rage!, 5 pow) csábító, de Vak vagy: a támadásod 1/3 eséllyel elmarad, és a Six-It! + Samesies! után nem marad CP-d " +
      "a Buh-Bye!-ra. A Buh-Bye!-jal leveszed magadról a Vakot (2 CP), egy Six-It!-tel (1 CP) meglesz a 4 pow, és a Kritikus ütés II " +
      "(Crit Bash II) előbb Kábít, utána 7 védhetetlen sebzést visz be. A kábított Holdtündé nem költheti el az Elkerülést, " +
      "így a 7 sebzés biztosan halálos.",
  },
];

export function puzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}
