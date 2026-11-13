import type { BracketMatch, Participant } from "./types";
import { createRng, shuffle } from "./seed";

export function generateDoubleElimination(
  players: Participant[],
  opts: { seed: string; grandFinalReset?: boolean },
): BracketMatch[] {
  const active = players.filter((p) => !p.dropped);
  if (active.length < 2) return [];

  const seeded = seedOrder(active, opts.seed);
  const size = nextPow2(seeded.length);
  const wRounds = Math.log2(size);
  const matches: BracketMatch[] = [];

  // --- Winners bracket ---
  for (let r = 0; r < wRounds; r++) {
    const count = size / Math.pow(2, r + 1);
    for (let s = 0; s < count; s++) {
      const key = `W-r${r}-s${s}`;
      const m: BracketMatch = {
        key,
        bracket: "winners",
        round: r,
        slot: s,
        p1: null,
        p2: null,
      };
      if (r < wRounds - 1) {
        m.winnerTo = { key: `W-r${r + 1}-s${Math.floor(s / 2)}`, slot: (s % 2 === 0 ? 1 : 2) };
      }
      matches.push(m);
    }
  }

  // --- Losers bracket ---
  // Losers bracket has 2 * (wRounds - 1) rounds.
  // Even losers rounds (0, 2, 4, ...) receive drop-ins from the winners bracket.
  // Odd losers rounds are internal matches between losers-bracket survivors.
  const lRounds = 2 * (wRounds - 1);

  for (let lr = 0; lr < lRounds; lr++) {
    const count = losersRoundSize(size, lr);
    for (let s = 0; s < count; s++) {
      const key = `L-r${lr}-s${s}`;
      const m: BracketMatch = {
        key,
        bracket: "losers",
        round: lr,
        slot: s,
        p1: null,
        p2: null,
      };
      if (lr < lRounds - 1) {
        const nextLr = lr + 1;
        const nextCount = losersRoundSize(size, nextLr);
        if (nextCount === count) {
          m.winnerTo = { key: `L-r${nextLr}-s${s}`, slot: 1 };
        } else {
          m.winnerTo = { key: `L-r${nextLr}-s${Math.floor(s / 2)}`, slot: (s % 2 === 0 ? 1 : 2) };
        }
      }
      matches.push(m);
    }
  }

  // --- Connect winners bracket losers to losers bracket ---
  for (let wr = 0; wr < wRounds - 1; wr++) {
    const wCount = size / Math.pow(2, wr + 1);
    const lr = wr * 2;
    const lCount = losersRoundSize(size, lr);
    const isReversed = wr % 2 === 1;

    for (let s = 0; s < wCount; s++) {
      const wKey = `W-r${wr}-s${s}`;
      const wMatch = matches.find((m) => m.key === wKey);
      if (!wMatch) continue;

      const targetSlot = isReversed ? wCount - 1 - s : s;
      if (targetSlot < lCount) {
        wMatch.loserTo = { key: `L-r${lr}-s${targetSlot}`, slot: 2 };
      }
    }
  }

  // --- Grand final ---
  const wFinalKey = `W-r${wRounds - 1}-s0`;
  const lFinalKey = `L-r${lRounds - 1}-s0`;

  const gf: BracketMatch = {
    key: "GF-r0-s0",
    bracket: "final",
    round: 0,
    slot: 0,
    p1: null,
    p2: null,
  };
  matches.push(gf);

  const wFinal = matches.find((m) => m.key === wFinalKey);
  const lFinal = matches.find((m) => m.key === lFinalKey);
  if (wFinal) wFinal.winnerTo = { key: gf.key, slot: 1 };
  if (lFinal) lFinal.winnerTo = { key: gf.key, slot: 2 };

  if (opts.grandFinalReset) {
    const gfReset: BracketMatch = {
      key: "GF-r1-s0",
      bracket: "final",
      round: 1,
      slot: 0,
      p1: null,
      p2: null,
    };
    matches.push(gfReset);
    gf.winnerTo = undefined;
    gf.loserTo = { key: gfReset.key, slot: 1 };
  }

  // --- Place players into round 0 ---
  const positions = seedPositions(size);
  const r0matches = matches.filter((m) => m.bracket === "winners" && m.round === 0);
  r0matches.sort((a, b) => a.slot - b.slot);

  for (let s = 0; s < size / 2; s++) {
    const m = r0matches[s];
    if (!m) continue;
    const i1 = positions[s * 2];
    const i2 = positions[s * 2 + 1];
    m.p1 = i1 < seeded.length ? seeded[i1].id : null;
    m.p2 = i2 < seeded.length ? seeded[i2].id : null;

    if (m.p1 && !m.p2) {
      m.autoAdvance = m.p1;
    } else if (!m.p1 && m.p2) {
      m.autoAdvance = m.p2;
    }
  }

  // Auto-advance through winners bracket
  for (const m of matches.filter((x) => x.bracket === "winners")) {
    if (m.autoAdvance) {
      if (m.winnerTo) {
        const next = matches.find((x) => x.key === m.winnerTo!.key);
        if (next) {
          if (m.winnerTo.slot === 1) next.p1 = m.autoAdvance;
          else next.p2 = m.autoAdvance;
        }
      }
      // A bye produces no loser — do NOT send anyone to the losers bracket
    }
  }

  // Check for newly created single-player matches from auto-advances
  for (const m of matches) {
    if (!m.autoAdvance && m.p1 && !m.p2 && m.bracket === "winners") {
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

  return matches;
}

function losersRoundSize(bracketSize: number, losersRound: number): number {
  // Even rounds receive drop-ins: same size as previous losers round or half of winners round
  // Odd rounds halve the field
  const halfSize = bracketSize / 2;
  let s = halfSize;
  for (let lr = 0; lr <= losersRound; lr++) {
    if (lr === 0) {
      s = halfSize / 2;
    } else if (lr % 2 === 1) {
      // Internal round: halves the count
      s = Math.max(1, Math.floor(s / 2));
    }
    // Even rounds (except 0) keep the same count — they receive drop-ins
  }
  return Math.max(1, s);
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
