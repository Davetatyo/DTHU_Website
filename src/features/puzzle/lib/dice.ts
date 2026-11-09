// Dice of the Season 1 heroes the puzzles know, and the dice patterns abilities ask for.
// Pure and browser-safe.

export type HeroId = "barbarian" | "moon-elf";

export type Sym = "sword" | "heart" | "pow" | "arrow" | "foot" | "moon";

/** The symbol on each face, index = value − 1 (from the heroes' leaflets). */
export const FACES: Record<HeroId, readonly Sym[]> = {
  barbarian: ["sword", "sword", "sword", "heart", "heart", "pow"],
  "moon-elf": ["arrow", "arrow", "arrow", "foot", "foot", "moon"],
};

export const SYM_HU: Record<Sym, string> = {
  sword: "kard",
  heart: "szív",
  pow: "pow",
  arrow: "nyíl",
  foot: "láb",
  moon: "hold",
};

export function symbolOf(hero: HeroId, value: number): Sym {
  return FACES[hero][value - 1];
}

export function countSym(hero: HeroId, dice: readonly number[], sym: Sym): number {
  return dice.filter((v) => symbolOf(hero, v) === sym).length;
}

/** A run of `length` consecutive numbers among the dice (4 = small straight, 5 = large). */
export function hasStraight(dice: readonly number[], length: 4 | 5): boolean {
  const have = new Set(dice);
  for (let start = 1; start + length - 1 <= 6; start++) {
    let ok = true;
    for (let v = start; v < start + length; v++) if (!have.has(v)) ok = false;
    if (ok) return true;
  }
  return false;
}

/** The most dice showing the same number. */
export function maxOfAKind(dice: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const v of dice) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Math.max(0, ...counts.values());
}

/** Every outcome of rolling `n` dice (6^n arrays). Only for small n. */
export function allRolls(n: number): number[][] {
  let rolls: number[][] = [[]];
  for (let i = 0; i < n; i++) rolls = rolls.flatMap((r) => [1, 2, 3, 4, 5, 6].map((v) => [...r, v]));
  return rolls;
}
