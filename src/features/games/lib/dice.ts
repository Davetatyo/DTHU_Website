// Kockázat: a dice-poker game against the Barbarian (classic rules, Dice Throne names).
// Pure functions, unit-tested. Owner decisions (2026-11-03): 5 dice, 3 rolls per turn, keep
// dice between rolls; a short (7 rounds, lower section only) and a full game (13 rounds,
// with the 63 → +35 bonus); "Ultimate" for five of a kind (50); no sound, no saving.

export type Category =
  | "ones" | "twos" | "threes" | "fours" | "fives" | "sixes"
  | "three-kind" | "four-kind" | "full" | "small" | "large" | "ultimate" | "chance";

export const UPPER: Category[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
export const LOWER: Category[] = ["three-kind", "four-kind", "full", "small", "large", "ultimate", "chance"];

export const LABELS: Record<Category, string> = {
  ones: "Egyesek",
  twos: "Kettesek",
  threes: "Hármasok",
  fours: "Négyesek",
  fives: "Ötösök",
  sixes: "Hatosok",
  "three-kind": "Három egyforma",
  "four-kind": "Négy egyforma",
  full: "Full",
  small: "Kis sor",
  large: "Nagy sor",
  ultimate: "Ultimate",
  chance: "Esély",
};

/** What the box gives, shown under its name. */
export const HINTS: Record<Category, string> = {
  ones: "az egyesek összege",
  twos: "a kettesek összege",
  threes: "a hármasok összege",
  fours: "a négyesek összege",
  fives: "az ötösök összege",
  sixes: "a hatosok összege",
  "three-kind": "3 egyforma: összes pötty",
  "four-kind": "4 egyforma: összes pötty",
  full: "3 + 2 egyforma: 25",
  small: "4 egymás után: 30",
  large: "5 egymás után: 40",
  ultimate: "5 egyforma: 50",
  chance: "bármi: összes pötty",
};

export const BONUS_AT = 63;
export const BONUS = 35;

export type Variant = "short" | "full";
export const VARIANTS: Record<Variant, { categories: Category[]; label: string; detail: string }> = {
  short: { categories: LOWER, label: "Csak pár percem van", detail: "Gyors csata · 7 kör" },
  full: { categories: [...UPPER, ...LOWER], label: "Ráérek, jöhet a teljes hadjárat", detail: "13 kör, bónusszal" },
};

const counts = (dice: number[]) => {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) c[d]++;
  return c;
};
const sum = (dice: number[]) => dice.reduce((a, b) => a + b, 0);
const run = (dice: number[], length: number) => {
  const has = new Set(dice);
  for (let start = 1; start + length - 1 <= 6; start++) {
    let ok = true;
    for (let v = start; v < start + length; v++) if (!has.has(v)) ok = false;
    if (ok) return true;
  }
  return false;
};

/** What the dice score in a box. */
export function score(category: Category, dice: number[]): number {
  const c = counts(dice);
  const most = Math.max(...c);
  switch (category) {
    case "ones": return c[1] * 1;
    case "twos": return c[2] * 2;
    case "threes": return c[3] * 3;
    case "fours": return c[4] * 4;
    case "fives": return c[5] * 5;
    case "sixes": return c[6] * 6;
    case "three-kind": return most >= 3 ? sum(dice) : 0;
    case "four-kind": return most >= 4 ? sum(dice) : 0;
    case "full": return c.includes(3) && c.includes(2) ? 25 : 0;
    case "small": return run(dice, 4) ? 30 : 0;
    case "large": return run(dice, 5) ? 40 : 0;
    case "ultimate": return most === 5 ? 50 : 0;
    case "chance": return sum(dice);
  }
}

/** A player's scores so far (box → points). */
export type Card = Partial<Record<Category, number>>;

export const upperSum = (card: Card) => UPPER.reduce((a, c) => a + (card[c] ?? 0), 0);
export const bonus = (card: Card, variant: Variant) => (variant === "full" && upperSum(card) >= BONUS_AT ? BONUS : 0);
export const total = (card: Card, variant: Variant) =>
  Object.values(card).reduce((a, b) => a + (b ?? 0), 0) + bonus(card, variant);

export const openBoxes = (card: Card, variant: Variant) => VARIANTS[variant].categories.filter((c) => card[c] === undefined);

export const rollDie = (rand: () => number = Math.random) => 1 + Math.floor(rand() * 6);

/** The best combination the dice make, for the Barbarian's cheering ("Kis sor!"). */
export function highlight(dice: number[]): "ultimate" | "large" | "small" | "full" | "four-kind" | null {
  if (score("ultimate", dice)) return "ultimate";
  if (score("large", dice)) return "large";
  if (score("small", dice)) return "small";
  if (score("full", dice)) return "full";
  if (score("four-kind", dice)) return "four-kind";
  return null;
}

// ---- The Barbarian's play: a "decent amateur" ----

/** About what an average turn scores in each box: filling a box with less is a loss. */
const TYPICAL: Record<Category, number> = {
  ones: 2, twos: 5, threes: 8, fours: 12, fives: 15, sixes: 18,
  "three-kind": 20, "four-kind": 12, full: 20, small: 25, large: 25, ultimate: 15, chance: 22,
};

/** How good these dice are for him now: the best box's score minus what that box usually gives. */
function value(dice: number[], open: Category[]): number {
  let best = -Infinity;
  for (const c of open) best = Math.max(best, score(c, dice) - TYPICAL[c] * 0.6);
  return best;
}

/** How often he's too busy cheering for you and keeps his second-best choice of dice. */
export const DISTRACTED = 0.3;

/**
 * Which dice he keeps before his next roll (true = keep): every choice is tried a few times
 * with random rolls; now and then (`distracted`) he takes the second best.
 */
export function chooseHolds(
  dice: number[],
  open: Category[],
  rollsLeft: number,
  rand: () => number = Math.random,
  tries = 40,
  distracted = 0,
): boolean[] {
  const ranked: { mask: number; avg: number }[] = [];
  for (let mask = 0; mask < 32; mask++) {
    let sum = 0;
    for (let t = 0; t < tries; t++) {
      let d = dice.slice();
      for (let r = 0; r < rollsLeft; r++) d = d.map((v, i) => (mask & (1 << i) ? v : rollDie(rand)));
      sum += value(d, open);
    }
    ranked.push({ mask, avg: sum / tries });
  }
  ranked.sort((a, b) => b.avg - a.avg);
  const mask = ranked[rand() < distracted ? 1 : 0].mask;
  return dice.map((_, i) => !!(mask & (1 << i)));
}

/** Where he writes his final dice. */
export function chooseBox(dice: number[], open: Category[]): Category {
  let best = open[0];
  let bestValue = -Infinity;
  for (const c of open) {
    const v = score(c, dice) - TYPICAL[c] * 0.6;
    if (v > bestValue) {
      bestValue = v;
      best = c;
    }
  }
  return best;
}
