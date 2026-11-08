// Levels from a player's XP total (roadmap R4, agreed 2026-11-08). Pure and browser-safe.
// Everyone starts at level 0. Level n → n+1 costs `first + step·n`: with the default 25, 45, 65, …,
// so level 20 needs 4,300 XP. Year two (levels 21+) is still to be decided; until then the
// curve simply continues.

export type Curve = { first: number; step: number };

export const DEFAULT_CURVE: Curve = { first: 25, step: 20 };

/** XP needed to go from `level` to `level + 1`. */
export function levelCost(level: number, curve: Curve = DEFAULT_CURVE): number {
  return curve.first + curve.step * level;
}

/** Total XP at which `level` is reached. */
export function levelStart(level: number, curve: Curve = DEFAULT_CURVE): number {
  return level * curve.first + (curve.step * level * (level - 1)) / 2;
}

export type LevelInfo = {
  level: number;
  total: number;
  /** Total XP where this level started and where the next one starts. */
  from: number;
  to: number;
  /** XP earned inside this level, and still needed for the next. */
  into: number;
  need: number;
  /** Progress to the next level, 0–100. */
  pct: number;
};

export function levelInfo(total: number, curve: Curve = DEFAULT_CURVE): LevelInfo {
  const xp = Math.max(0, Math.floor(total));
  let level = 0;
  while (levelStart(level + 1, curve) <= xp) level++;
  const from = levelStart(level, curve);
  const to = levelStart(level + 1, curve);
  return { level, total: xp, from, to, into: xp - from, need: to - xp, pct: Math.round(((xp - from) / (to - from)) * 1000) / 10 };
}

/** The levels reached when a total goes from `before` to `after` (empty if none). */
export function levelsReached(before: number, after: number, curve: Curve = DEFAULT_CURVE): number[] {
  const from = levelInfo(before, curve).level;
  const to = levelInfo(after, curve).level;
  return Array.from({ length: Math.max(0, to - from) }, (_, i) => from + 1 + i);
}

/** A curve an admin may set: positive multiples of 5, within sane limits. */
export function isValidCurve(curve: Curve): boolean {
  const ok = (n: number, max: number) => Number.isInteger(n) && n > 0 && n <= max && n % 5 === 0;
  return ok(curve.first, 500) && ok(curve.step, 500);
}
