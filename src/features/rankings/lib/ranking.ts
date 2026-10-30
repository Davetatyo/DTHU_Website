// Ranking rows. Until real results exist (they live in Karnyx, see the feature README), the
// numbers are SAMPLE data generated from each player's name, as in the prototype. Names and
// heroes are real: they come from the active tournament's roster.

export type RankRow = {
  /** Karnyx name */
  p: string;
  hero: string;
  /** matches, wins, losses, points, tickets */
  m: number;
  w: number;
  l: number;
  pts: number;
  tix: number;
};

function hash(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Sample season stats per player, sorted by points, then wins. */
export function sampleRanking(players: { karnyx_name: string; heroes: string[] }[]): RankRow[] {
  return players
    .map(({ karnyx_name: p, heroes }) => {
      const h = hash(p);
      const m = 6 + (h % 5);
      const w = Math.min(m, (h >>> 3) % (m + 1));
      return { p, hero: heroes[0] ?? "", m, w, l: m - w, pts: w * 3 + ((h >>> 9) % 2), tix: m + w + ((h >>> 11) % 3) * 2 };
    })
    .sort((a, b) => b.pts - a.pts || b.w - a.w || a.p.localeCompare(b.p, "hu"));
}

/** Sample change since last week: [css class, label]. */
export function movement(name: string): ["up" | "dn" | "eq", string] {
  const h = hash(name) % 5;
  return h === 0 ? ["up", "▲2"] : h === 1 ? ["dn", "▼1"] : h === 2 ? ["up", "▲1"] : ["eq", "–"];
}
