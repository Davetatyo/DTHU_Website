import { matchHpDiff, matchPoints } from "./scoring";
import { DEFAULT_SCORING, type MatchResult, type Participant, type PlayerId, type Scoring, type Standing } from "./types";

/**
 * Standings, ranked by:
 *   1. points (per the championship's scoring)
 *   2. Buchholz: the sum of all opponents' current points, nothing cut (short events have too few
 *      opponents to drop one). A Bye counts as a dummy opponent with the player's own points
 *      (FIDE C.07 Art. 16.4), so it neither helps nor hurts the player who got it.
 *   3. HP difference (see matchHpDiff)
 *   4. head-to-head among the players still tied
 *   5. seed
 * Dropped players are left out of the table, but their points still count in their opponents'
 * Buchholz.
 */
export function standings(players: Participant[], history: MatchResult[], scoring: Scoring = DEFAULT_SCORING): Standing[] {
  const active = players.filter((p) => !p.dropped);
  const seedMap = new Map(players.map((p) => [p.id, p.seed ?? Infinity]));

  type Stats = { wins: number; draws: number; losses: number; points: number; hpDiff: number; opponents: (PlayerId | null)[] };
  const stats = new Map<PlayerId, Stats>();
  const get = (id: PlayerId): Stats => {
    let s = stats.get(id);
    if (!s) {
      s = { wins: 0, draws: 0, losses: 0, points: 0, hpDiff: 0, opponents: [] };
      stats.set(id, s);
    }
    return s;
  };
  for (const p of players) get(p.id);

  for (const m of history) {
    const pts = matchPoints(m, scoring);
    if (!pts) continue;
    const a = get(m.p1);
    a.points += pts.p1;
    if (!m.p2 || m.status === "bye") {
      a.wins++;
      a.opponents.push(null);
      continue;
    }
    const b = get(m.p2);
    b.points += pts.p2;
    a.opponents.push(m.p2);
    b.opponents.push(m.p1);
    const hp = matchHpDiff(m);
    a.hpDiff += hp.p1;
    b.hpDiff += hp.p2;
    if (m.status === "draw") {
      a.draws++;
      b.draws++;
    } else if (m.winner === m.p1) {
      a.wins++;
      b.losses++;
    } else {
      b.wins++;
      a.losses++;
    }
  }

  const result: Standing[] = active.map((p) => {
    const s = get(p.id);
    const buchholz = s.opponents.reduce((sum, o) => sum + (o ? (stats.get(o)?.points ?? 0) : s.points), 0);
    return { id: p.id, rank: 0, points: s.points, wins: s.wins, draws: s.draws, losses: s.losses, buchholz, hpDiff: s.hpDiff };
  });

  // Head-to-head: wins minus losses against the others on the same points, Buchholz and HP.
  const tieKey = (s: Standing) => `${s.points}|${s.buchholz}|${s.hpDiff}`;
  const tied = new Map<string, Standing[]>();
  for (const s of result) tied.set(tieKey(s), [...(tied.get(tieKey(s)) ?? []), s]);
  for (const group of tied.values()) {
    if (group.length < 2) continue;
    const ids = new Set(group.map((s) => s.id));
    for (const s of group) {
      const h2h: Record<PlayerId, number> = {};
      for (const m of history) {
        if ((m.status !== "played" && m.status !== "forfeit") || !m.winner || !m.p2) continue;
        const loser = m.winner === m.p1 ? m.p2 : m.p1;
        if (m.winner === s.id && ids.has(loser)) h2h[loser] = (h2h[loser] ?? 0) + 1;
        else if (loser === s.id && ids.has(m.winner)) h2h[m.winner] = (h2h[m.winner] ?? 0) - 1;
      }
      s.headToHead = h2h;
    }
  }
  const h2hSum = (s: Standing) => (s.headToHead ? Object.values(s.headToHead).reduce((sum, v) => sum + v, 0) : 0);

  result.sort(
    (a, b) =>
      b.points - a.points ||
      b.buchholz - a.buchholz ||
      b.hpDiff - a.hpDiff ||
      h2hSum(b) - h2hSum(a) ||
      (seedMap.get(a.id) ?? Infinity) - (seedMap.get(b.id) ?? Infinity),
  );
  result.forEach((s, i) => (s.rank = i + 1));
  return result;
}
