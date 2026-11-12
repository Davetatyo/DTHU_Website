import type { MatchResult, PlayerId, Scoring } from "./types";

/** Points each side gets from one match; null for a match without a result yet. */
export function matchPoints(m: MatchResult, scoring: Scoring): { p1: number; p2: number } | null {
  if (m.status === "bye" || !m.p2) return { p1: scoring.bye, p2: 0 };
  if (m.status === "draw") return { p1: scoring.draw, p2: scoring.draw };
  if ((m.status === "played" || m.status === "forfeit") && m.winner) {
    return m.winner === m.p1 ? { p1: scoring.win, p2: scoring.loss } : { p1: scoring.loss, p2: scoring.win };
  }
  return null;
}

/** Everyone's points from the given matches (players without a result are left out). */
export function pointsFrom(history: readonly MatchResult[], scoring: Scoring): Map<PlayerId, number> {
  const points = new Map<PlayerId, number>();
  const add = (id: PlayerId, n: number) => points.set(id, (points.get(id) ?? 0) + n);
  for (const m of history) {
    const got = matchPoints(m, scoring);
    if (!got) continue;
    add(m.p1, got.p1);
    if (m.p2) add(m.p2, got.p2);
  }
  return points;
}

/**
 * HP difference of one match for each side: the winner gets + the health they finished on, the
 * loser − the same (their own health is ignored, so a conceded game can't count against the
 * winner). Draws, Byes and matches without a result: 0.
 */
export function matchHpDiff(m: MatchResult): { p1: number; p2: number } {
  if (!m.p2 || !m.winner || (m.status !== "played" && m.status !== "forfeit")) return { p1: 0, p2: 0 };
  const winnerHp = (m.winner === m.p1 ? m.hpA : m.hpB) ?? 0;
  return m.winner === m.p1 ? { p1: winnerHp, p2: -winnerHp } : { p1: -winnerHp, p2: winnerHp };
}
