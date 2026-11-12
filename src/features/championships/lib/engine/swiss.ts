// Swiss pairing, Dutch system (after FIDE C.04.3, without colours: Dice Throne has none).
//
// Players are ranked by points, then by seed (their pairing number). Players on the same points
// form a score group. Within a score group the top half plays the bottom half (1 v 5, 2 v 6, …
// in a group of eight). When a group can't be paired inside itself (odd size, or rematches),
// its lowest player floats down to the top of the next group.
//
// Every candidate pairing gets a cost made of these criteria, most important first:
//   1. MANDATORY: no rematch and no second Bye. Such pairs are never offered; when no pairing
//      without them exists, the round is refused with an error (the admin decides what's next).
//      Within the default round count (log2 of the field) one always exists (property-tested).
//   2. the Bye goes to the lowest-ranked player of the lowest score group
//   3. as few players as possible float to another score group
//   4. floaters cross as small a score difference as possible
//   5. nobody floats the same way as last round (or, less important, two rounds ago);
//      a Bye counts as floating down
//   6. the Dutch order: top half v bottom half; a floater is the lowest of its group and meets
//      the highest of the next
// Floaters (3) are counted group by group from the top, so the top group is settled first.
// Each criterion gets its own range in one bigint weight, so a better result on a higher
// criterion always beats any amount of the lower ones. A maximum weight perfect matching
// (matching.ts) then finds the best pairing of the whole field at once, which also looks ahead:
// a choice in the top group that would leave the lower groups unpairable is never made.

import { maxWeightMatching, type WeightedEdge } from "./matching";
import { pointsFrom } from "./scoring";
import { DEFAULT_SCORING, type MatchResult, type Pairing, type Participant, type PlayerId, type Scoring } from "./types";

export function defaultSwissRounds(playerCount: number): number {
  return Math.max(1, Math.ceil(Math.log2(Math.max(2, playerCount))));
}

type Float = "down" | "up" | null;

type Ranked = { id: PlayerId; points: number; rank: number; group: number; pos: number; size: number };

export function nextSwissRound(
  players: Participant[],
  history: MatchResult[],
  opts: { scoring?: Scoring } = {},
): { pairings: Pairing[]; warnings: string[] } {
  const scoring = opts.scoring ?? DEFAULT_SCORING;
  const active = players.filter((p) => !p.dropped);
  if (active.length < 2) return { pairings: [], warnings: [] };

  const points = pointsFrom(history, scoring);
  const ptsOf = (id: PlayerId) => points.get(id) ?? 0;
  const seedOf = new Map(players.map((p) => [p.id, p.seed ?? Number.MAX_SAFE_INTEGER]));

  const sorted = active
    .slice()
    .sort((a, b) => ptsOf(b.id) - ptsOf(a.id) || seedOf.get(a.id)! - seedOf.get(b.id)! || a.id.localeCompare(b.id));
  const groupScores = [...new Set(sorted.map((p) => ptsOf(p.id)))];
  const ranked: Ranked[] = [];
  for (const [rank, p] of sorted.entries()) {
    const pts = ptsOf(p.id);
    const group = groupScores.indexOf(pts);
    const pos = ranked.filter((r) => r.group === group).length;
    ranked.push({ id: p.id, points: pts, rank, group, pos, size: 0 });
  }
  for (const r of ranked) r.size = ranked.filter((x) => x.group === r.group).length;

  const played = new Map<PlayerId, Set<PlayerId>>();
  const byes = new Map<PlayerId, number>();
  for (const m of history) {
    if (!m.p2 || m.status === "bye") {
      byes.set(m.p1, (byes.get(m.p1) ?? 0) + 1);
      continue;
    }
    if (!played.has(m.p1)) played.set(m.p1, new Set());
    if (!played.has(m.p2)) played.set(m.p2, new Set());
    played.get(m.p1)!.add(m.p2);
    played.get(m.p2)!.add(m.p1);
  }
  const floats = floatHistory(history, scoring);

  const n = ranked.length;
  const bye = n % 2 === 1 ? n : -1;
  const groupCount = groupScores.length;

  // Weight of each criterion: one more than the largest total the criteria below it can reach
  // in a round (at most n/2 + 1 pairs), so a higher criterion always wins.
  const N = BigInt(n + 1);
  const maxDiff = BigInt(Math.round(((groupScores[0] ?? 0) - (groupScores[groupCount - 1] ?? 0)) * 2));
  const W_ORDER = BigInt(1);
  const W_FLOAT_REPEAT = W_ORDER * (BigInt(2) * N * N + BigInt(1));
  const W_SCORE_DIFF = W_FLOAT_REPEAT * (BigInt(10) * N + BigInt(1));
  const W_FLOATERS = W_SCORE_DIFF * (maxDiff * N + BigInt(1));
  // Floaters are counted per score group, top first: a floater from a higher group outweighs any
  // number from the groups below it (the Dutch system settles the top group first).
  const floaterWeight = (group: number) => W_FLOATERS * N ** BigInt(groupCount - 1 - group);
  const W_BYE = W_FLOATERS * N ** BigInt(groupCount);
  const TOP = W_BYE * (BigInt(groupCount) * N + N);

  /** Cost of pairing ranked[i] with ranked[j] (j = bye for the Bye), or null when not allowed. */
  const cost = (i: number, j: number): bigint | null => {
    if (j === bye) {
      const p = ranked[i];
      if ((byes.get(p.id) ?? 0) > 0) return null;
      const fromBottom = groupCount - 1 - p.group;
      return (
        W_BYE * BigInt(fromBottom * (n + 1) + (n - 1 - p.rank)) +
        W_FLOAT_REPEAT * BigInt(floatPenalty(floats, p.id, "down"))
      );
    }
    const [hi, lo] = ranked[i].rank < ranked[j].rank ? [ranked[i], ranked[j]] : [ranked[j], ranked[i]];
    if (played.get(hi.id)?.has(lo.id)) return null;
    let c = BigInt(0);
    if (hi.group === lo.group) {
      const half = Math.floor(hi.size / 2);
      c += W_ORDER * BigInt(Math.abs(lo.pos - hi.pos - half));
    } else {
      c += floaterWeight(hi.group);
      c += W_SCORE_DIFF * BigInt(Math.round((hi.points - lo.points) * 2));
      c += W_FLOAT_REPEAT * BigInt(floatPenalty(floats, hi.id, "down") + floatPenalty(floats, lo.id, "up"));
      c += W_ORDER * BigInt(hi.size - 1 - hi.pos + lo.pos);
    }
    return c;
  };

  const edges: WeightedEdge[] = [];
  const vertices = bye >= 0 ? n + 1 : n;
  for (let i = 0; i < vertices; i++) {
    for (let j = i + 1; j < vertices; j++) {
      const c = i === bye ? cost(j, i) : cost(i, j);
      if (c !== null) edges.push([i, j, TOP - c]);
    }
  }
  const mate = maxWeightMatching(edges, true);
  for (let v = 0; v < vertices; v++) {
    if ((mate[v] ?? -1) < 0) return { pairings: [], warnings: [NO_CLEAN_PAIRING] };
  }

  const pairings: Pairing[] = [];
  let byePairing: Pairing | null = null;
  for (let v = 0; v < n; v++) {
    const m = mate[v];
    if (m === bye) byePairing = { p1: ranked[v].id, p2: null };
    else if (m > v) pairings.push({ p1: ranked[v].id, p2: ranked[m].id });
  }
  if (byePairing) pairings.push(byePairing);
  return { pairings, warnings: [] };
}

export const NO_CLEAN_PAIRING =
  "Nincs olyan párosítás, amelyben senki nem játszik újra ugyanazzal az ellenféllel, és senki nem kap második Bye-t. A fordulót nem lehet elindítani: zárd le a versenyt, vagy vegyél fel / távolíts el játékost.";

/** Penalty for floating `dir` again: 4 if the player did so last round, 1 if two rounds ago. */
function floatPenalty(floats: Map<PlayerId, Float>[], id: PlayerId, dir: "down" | "up"): number {
  return (floats[0]?.get(id) === dir ? 4 : 0) + (floats[1]?.get(id) === dir ? 1 : 0);
}

/**
 * Who floated in the last two rounds ([last round, the one before]): the higher-scored player of
 * a pair across score groups floated down, the other up; a Bye counts as floating down.
 */
function floatHistory(history: MatchResult[], scoring: Scoring): Map<PlayerId, Float>[] {
  const roundNumbers = [...new Set(history.map((m) => m.round))].sort((a, b) => b - a).slice(0, 2);
  return roundNumbers.map((round) => {
    const before = pointsFrom(
      history.filter((m) => m.round < round),
      scoring,
    );
    const pts = (id: PlayerId) => before.get(id) ?? 0;
    const map = new Map<PlayerId, Float>();
    for (const m of history.filter((x) => x.round === round)) {
      if (!m.p2 || m.status === "bye") {
        map.set(m.p1, "down");
      } else if (pts(m.p1) !== pts(m.p2)) {
        const [hi, lo] = pts(m.p1) > pts(m.p2) ? [m.p1, m.p2] : [m.p2, m.p1];
        map.set(hi, "down");
        map.set(lo, "up");
      }
    }
    return map;
  });
}
