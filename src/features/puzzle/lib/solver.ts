// Finds the best line of a puzzle: every order of card plays (breadth first, so the shortest
// line is found first), then every ability the dice allow, scored by resolveAttack.
// Pure and browser-safe; small enough to run in the browser for a 5-card hand.

import { applyMove, availableAbilities, legalMoves, resolveAttack, type AttackResult, type Move, type PuzzleState } from "./engine";
import { card } from "./cards";

export type Line = { moves: Move[]; ability: string | null };
export type ScoredLine = Line & { result: AttackResult; cpSpent: number };

/** Win chance first, then tie chance, then fewer cards, then less CP. */
export function better(a: ScoredLine, b: ScoredLine): boolean {
  const eps = 1e-9;
  if (Math.abs(a.result.win - b.result.win) > eps) return a.result.win > b.result.win;
  if (Math.abs(a.result.tie - b.result.tie) > eps) return a.result.tie > b.result.tie;
  if (a.moves.length !== b.moves.length) return a.moves.length < b.moves.length;
  return a.cpSpent < b.cpSpent;
}

function key(s: PuzzleState): string {
  const st = (x: Record<string, number | undefined>) =>
    Object.entries(x)
      .filter(([, n]) => n)
      .sort()
      .map(([k, n]) => `${k}${n}`)
      .join(",");
  return [
    [...s.dice].sort().join(""),
    s.attacker.cp,
    [...s.hand].sort().join(","),
    st(s.attacker.statuses),
    st(s.defender.statuses),
  ].join("|");
}

export type Solution = {
  best: ScoredLine;
  /** The best line for each ability that can be reached (for feedback). */
  byAbility: Map<string, ScoredLine>;
  statesSeen: number;
};

export function solve(start: PuzzleState): Solution {
  const seen = new Set<string>([key(start)]);
  const queue: { s: PuzzleState; moves: Move[] }[] = [{ s: start, moves: [] }];
  let best: ScoredLine = { moves: [], ability: null, result: resolveAttack(start, null), cpSpent: 0 };
  const byAbility = new Map<string, ScoredLine>();

  for (let q = 0; q < queue.length; q++) {
    const { s, moves } = queue[q];
    const cpSpent = moves.reduce((sum, m) => sum + card(m.card).cost, 0);
    for (const a of availableAbilities(s)) {
      const line: ScoredLine = { moves, ability: a.id, result: resolveAttack(s, a.id), cpSpent };
      if (better(line, best)) best = line;
      const prev = byAbility.get(a.id);
      if (!prev || better(line, prev)) byAbility.set(a.id, line);
    }
    for (const m of legalMoves(s)) {
      const next = applyMove(s, m);
      if (typeof next === "string") continue;
      const k = key(next);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ s: next, moves: [...moves, m] });
    }
  }
  return { best, byAbility, statesSeen: seen.size };
}

/** Plays a whole line from the start; null if a move isn't legal. */
export function playLine(start: PuzzleState, moves: Move[]): PuzzleState | null {
  let s = start;
  for (const m of moves) {
    const n = applyMove(s, m);
    if (typeof n === "string") return null;
    s = n;
  }
  return s;
}
