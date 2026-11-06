import { DRAW_POINTS, type MatchResult, type Participant, type PlayerId, type Standing } from "./types";

export function standings(players: Participant[], history: MatchResult[]): Standing[] {
  const active = players.filter((p) => !p.dropped);
  const ids = new Set(active.map((p) => p.id));
  const seedMap = new Map(players.map((p) => [p.id, p.seed ?? Infinity]));

  const stats = new Map<
    PlayerId,
    { wins: number; draws: number; losses: number; points: number; opponents: PlayerId[]; gameDiff: number }
  >();
  for (const p of active) {
    stats.set(p.id, { wins: 0, draws: 0, losses: 0, points: 0, opponents: [], gameDiff: 0 });
  }

  for (const m of history) {
    if (m.status === "pending") continue;

    if (m.status === "draw") {
      if (!m.p2) continue;
      for (const [me, opp] of [
        [m.p1, m.p2],
        [m.p2, m.p1],
      ]) {
        const s = stats.get(me);
        if (s) {
          s.draws++;
          s.points += DRAW_POINTS;
          s.opponents.push(opp);
        }
      }
      continue;
    }

    if (m.status === "bye") {
      const s = stats.get(m.p1);
      if (s) {
        s.wins++;
        s.points++;
      }
      continue;
    }

    if ((m.status === "played" || m.status === "forfeit") && m.winner) {
      const loserId = m.winner === m.p1 ? m.p2 : m.p1;

      const sw = stats.get(m.winner);
      if (sw) {
        sw.wins++;
        sw.points++;
        if (m.p2 && loserId) {
          sw.opponents.push(loserId);
          sw.gameDiff++;
        }
      }

      if (loserId) {
        const sl = stats.get(loserId);
        if (sl) {
          sl.losses++;
          if (m.winner) {
            sl.opponents.push(m.winner);
            sl.gameDiff--;
          }
        }
      }
    }
  }

  // Buchholz: sum of opponents' points (byes add nothing)
  const pointsOf = (id: PlayerId) => stats.get(id)?.points ?? 0;

  const result: Standing[] = [];
  for (const [id, s] of stats) {
    if (!ids.has(id)) continue;
    const buchholz = s.opponents.reduce((sum, opp) => sum + pointsOf(opp), 0);
    result.push({
      id,
      rank: 0,
      points: s.points,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      buchholz,
      gameDiff: s.gameDiff,
    });
  }

  // Compute head-to-head among tied players
  const byPoints = new Map<number, Standing[]>();
  for (const s of result) {
    const group = byPoints.get(s.points) ?? [];
    group.push(s);
    byPoints.set(s.points, group);
  }

  for (const group of byPoints.values()) {
    if (group.length < 2) continue;
    const groupIds = new Set(group.map((s) => s.id));
    for (const s of group) {
      const h2h: Record<PlayerId, number> = {};
      for (const m of history) {
        if (m.status !== "played" && m.status !== "forfeit") continue;
        if (!m.winner || !m.p2) continue;
        if (m.winner === s.id && groupIds.has(m.p2)) {
          h2h[m.p2] = (h2h[m.p2] ?? 0) + 1;
        } else if (m.p2 && m.winner !== s.id) {
          const loser = m.winner === m.p1 ? m.p2 : m.p1;
          if (loser === s.id && groupIds.has(m.winner)) {
            h2h[m.winner] = (h2h[m.winner] ?? 0) - 1;
          }
        }
      }
      s.headToHead = h2h;
    }
  }

  // Sort: points desc → buchholz desc → h2h sum desc → gameDiff desc → seed asc
  result.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.buchholz !== b.buchholz) return b.buchholz - a.buchholz;
    const h2hA = a.headToHead ? Object.values(a.headToHead).reduce((s, v) => s + v, 0) : 0;
    const h2hB = b.headToHead ? Object.values(b.headToHead).reduce((s, v) => s + v, 0) : 0;
    if (h2hA !== h2hB) return h2hB - h2hA;
    if (a.gameDiff !== b.gameDiff) return b.gameDiff - a.gameDiff;
    return (seedMap.get(a.id) ?? Infinity) - (seedMap.get(b.id) ?? Infinity);
  });

  result.forEach((s, i) => (s.rank = i + 1));
  return result;
}
