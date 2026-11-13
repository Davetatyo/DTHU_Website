import type { BracketMatch, Participant } from "./types";
import { createRng, shuffle } from "./seed";

export function generateSingleElimination(
  players: Participant[],
  opts: { seed: string; thirdPlace?: boolean },
): BracketMatch[] {
  const active = players.filter((p) => !p.dropped);
  if (active.length < 2) return [];

  const seeded = seedOrder(active, opts.seed);
  const size = nextPow2(seeded.length);
  const totalRounds = Math.log2(size);
  const matches: BracketMatch[] = [];

  for (let r = 0; r < totalRounds; r++) {
    const matchesInRound = size / Math.pow(2, r + 1);
    for (let s = 0; s < matchesInRound; s++) {
      const key = `W-r${r}-s${s}`;
      const m: BracketMatch = {
        key,
        bracket: "winners",
        round: r,
        slot: s,
        p1: null,
        p2: null,
      };
      if (r < totalRounds - 1) {
        m.winnerTo = { key: `W-r${r + 1}-s${Math.floor(s / 2)}`, slot: (s % 2 === 0 ? 1 : 2) };
      }
      matches.push(m);
    }
  }

  // Place players into round 0 using standard seed positions
  const positions = seedPositions(size);
  for (let s = 0; s < size / 2; s++) {
    const m = matches[s];
    const i1 = positions[s * 2];
    const i2 = positions[s * 2 + 1];
    m.p1 = i1 < seeded.length ? seeded[i1].id : null;
    m.p2 = i2 < seeded.length ? seeded[i2].id : null;

    // Handle byes
    if (m.p1 && !m.p2) {
      m.autoAdvance = m.p1;
    } else if (!m.p1 && m.p2) {
      m.autoAdvance = m.p2;
    }
  }

  // Auto-advance byes into their next matches
  for (const m of matches) {
    if (m.autoAdvance && m.winnerTo) {
      const next = matches.find((x) => x.key === m.winnerTo!.key);
      if (next) {
        if (m.winnerTo.slot === 1) next.p1 = m.autoAdvance;
        else next.p2 = m.autoAdvance;
      }
    }
  }

  // Check for round-1 matches where both players are set via auto-advance
  // (happens when byes propagate)
  for (const m of matches) {
    if (!m.autoAdvance && m.p1 && !m.p2) {
      m.autoAdvance = m.p1;
      if (m.winnerTo) {
        const next = matches.find((x) => x.key === m.winnerTo!.key);
        if (next) {
          if (m.winnerTo.slot === 1) next.p1 = m.autoAdvance;
          else next.p2 = m.autoAdvance;
        }
      }
    }
  }

  // Third-place match
  if (opts.thirdPlace && totalRounds >= 2) {
    const sfRound = totalRounds - 2;
    const sf0 = `W-r${sfRound}-s0`;
    const sf1 = `W-r${sfRound}-s1`;
    const tp: BracketMatch = {
      key: "TP-r0-s0",
      bracket: "third_place",
      round: 0,
      slot: 0,
      p1: null,
      p2: null,
    };
    matches.push(tp);
    const m0 = matches.find((x) => x.key === sf0);
    const m1 = matches.find((x) => x.key === sf1);
    if (m0) m0.loserTo = { key: tp.key, slot: 1 };
    if (m1) m1.loserTo = { key: tp.key, slot: 2 };
  }

  return matches;
}

function seedOrder(players: Participant[], seed: string): Participant[] {
  const withSeeds = players.filter((p) => p.seed != null);
  const withoutSeeds = players.filter((p) => p.seed == null);
  withSeeds.sort((a, b) => a.seed! - b.seed!);
  const shuffled = shuffle(withoutSeeds, createRng(seed));
  return [...withSeeds, ...shuffled];
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard seed positions for a bracket of the given size.
 * For size 8: seeds 1v8, 4v5, 2v7, 3v6 → positions [0,7,3,4,1,6,2,5].
 * This ensures seed 1 and seed 2 can only meet in the final.
 */
function seedPositions(size: number): number[] {
  if (size === 1) return [0];
  if (size === 2) return [0, 1];

  const result: number[] = [0, 1];
  while (result.length < size) {
    const next: number[] = [];
    const currentMax = result.length;
    for (const pos of result) {
      next.push(pos);
      next.push(currentMax * 2 - 1 - pos);
    }
    result.length = 0;
    result.push(...next);
  }
  return result;
}
