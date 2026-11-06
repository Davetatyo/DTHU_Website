import { DRAW_POINTS, type MatchResult, type Pairing, type Participant, type PlayerId } from "./types";
import { createRng } from "./seed";

export function defaultSwissRounds(playerCount: number): number {
  return Math.max(1, Math.ceil(Math.log2(Math.max(2, playerCount))));
}

export function nextSwissRound(
  players: Participant[],
  history: MatchResult[],
  opts: { seed: string },
): { pairings: Pairing[]; warnings: string[] } {
  const active = players.filter((p) => !p.dropped);
  if (active.length < 2) return { pairings: [], warnings: [] };

  const roundNum = history.length > 0 ? Math.max(...history.map((m) => m.round)) + 1 : 1;
  const rng = createRng(opts.seed + roundNum);

  const played = buildPlayedMap(history);
  const hadBye = new Set<PlayerId>();
  for (const m of history) {
    if (m.status === "bye") hadBye.add(m.p1);
  }

  const points = new Map<PlayerId, number>();
  for (const p of active) points.set(p.id, 0);
  for (const m of history) {
    if (m.status === "bye") {
      points.set(m.p1, (points.get(m.p1) ?? 0) + 1);
    } else if (m.status === "draw" && m.p2) {
      points.set(m.p1, (points.get(m.p1) ?? 0) + DRAW_POINTS);
      points.set(m.p2, (points.get(m.p2) ?? 0) + DRAW_POINTS);
    } else if ((m.status === "played" || m.status === "forfeit") && m.winner) {
      points.set(m.winner, (points.get(m.winner) ?? 0) + 1);
    }
  }

  // Sort by points desc, then seed asc, then small random tiebreak
  const sorted = active.slice().sort((a, b) => {
    const pa = points.get(a.id) ?? 0;
    const pb = points.get(b.id) ?? 0;
    if (pa !== pb) return pb - pa;
    const sa = a.seed ?? Infinity;
    const sb = b.seed ?? Infinity;
    if (sa !== sb) return sa - sb;
    return rng() - 0.5;
  });

  if (roundNum === 1) {
    return firstRound(sorted);
  }

  // Try pairing with strict no-rematch
  const result = tryPairing(sorted, played, hadBye, false);
  if (result) return { pairings: result, warnings: [] };

  // Relax no-rematch rule
  const relaxed = tryPairing(sorted, played, hadBye, true);
  if (relaxed) {
    const rematches = countRematches(relaxed, played);
    return {
      pairings: relaxed,
      warnings: [`${rematches} rematch(es) were necessary because no clean pairing exists.`],
    };
  }

  return { pairings: [], warnings: ["Could not generate any pairing."] };
}

function firstRound(sorted: Participant[]): { pairings: Pairing[]; warnings: string[] } {
  const pairings: Pairing[] = [];
  const half = Math.floor(sorted.length / 2);

  for (let i = 0; i < half; i++) {
    pairings.push({ p1: sorted[i].id, p2: sorted[half + i].id });
  }

  if (sorted.length % 2 !== 0) {
    const byePlayer = sorted[sorted.length - 1];
    pairings.push({ p1: byePlayer.id, p2: null });
  }

  return { pairings, warnings: [] };
}

function tryPairing(
  sorted: Participant[],
  played: Map<PlayerId, Set<PlayerId>>,
  hadBye: Set<PlayerId>,
  allowRematches: boolean,
): Pairing[] | null {
  const n = sorted.length;
  const needsBye = n % 2 !== 0;
  let byePlayer: Participant | null = null;

  if (needsBye) {
    // Give bye to the lowest-ranked player who hasn't had one
    for (let i = n - 1; i >= 0; i--) {
      if (!hadBye.has(sorted[i].id)) {
        byePlayer = sorted[i];
        break;
      }
    }
    // If everyone has had a bye, give it to the lowest-ranked
    if (!byePlayer) byePlayer = sorted[n - 1];
  }

  const toPair = byePlayer ? sorted.filter((p) => p.id !== byePlayer!.id) : sorted.slice();

  const result = backtrack(toPair, played, allowRematches, 0, []);
  if (!result) return null;

  const pairings: Pairing[] = result;
  if (byePlayer) pairings.push({ p1: byePlayer.id, p2: null });
  return pairings;
}

function backtrack(
  players: Participant[],
  played: Map<PlayerId, Set<PlayerId>>,
  allowRematches: boolean,
  start: number,
  paired: Pairing[],
): Pairing[] | null {
  if (start >= players.length) return paired.slice();

  const p1 = players[start];
  for (let i = start + 1; i < players.length; i++) {
    const p2 = players[i];

    if (!allowRematches && played.get(p1.id)?.has(p2.id)) continue;

    paired.push({ p1: p1.id, p2: p2.id });

    // Swap p2 to position start+1 so remaining players are contiguous
    [players[start + 1], players[i]] = [players[i], players[start + 1]];

    const result = backtrack(players, played, allowRematches, start + 2, paired);
    if (result) return result;

    // Undo swap
    [players[start + 1], players[i]] = [players[i], players[start + 1]];
    paired.pop();
  }

  return null;
}

function buildPlayedMap(history: MatchResult[]): Map<PlayerId, Set<PlayerId>> {
  const map = new Map<PlayerId, Set<PlayerId>>();
  const add = (a: PlayerId, b: PlayerId) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const m of history) {
    if (m.p2) {
      add(m.p1, m.p2);
      add(m.p2, m.p1);
    }
  }
  return map;
}

function countRematches(pairings: Pairing[], played: Map<PlayerId, Set<PlayerId>>): number {
  let count = 0;
  for (const p of pairings) {
    if (p.p2 && played.get(p.p1)?.has(p.p2)) count++;
  }
  return count;
}
