// Who finished a tournament (roadmap R4): everyone who played or had a Bye in every round.
// Dropping out midway or not showing up doesn't count; the games already played keep their XP.
// Pure and browser-safe.

export type FinishMatch = { round_id: string; status: string; a: string; b: string | null };

export type FinishResult = {
  /** Karnyx names that finished. */
  finishers: string[];
  /** Byes, as player + round, so each Bye gets the game XP once. */
  byes: { name: string; roundId: string }[];
};

export function tournamentFinishers(roundIds: string[], matches: FinishMatch[]): FinishResult {
  const covered = new Map<string, Set<string>>();
  const byes: FinishResult["byes"] = [];
  const cover = (name: string, round: string) => {
    const key = name.toLowerCase();
    if (!covered.has(key)) covered.set(key, new Set());
    covered.get(key)!.add(round);
  };
  const names = new Map<string, string>();
  for (const m of matches) {
    for (const n of [m.a, m.b]) if (n) names.set(n.toLowerCase(), n);
    if (m.status === "bye" || !m.b) {
      cover(m.a, m.round_id);
      byes.push({ name: m.a, roundId: m.round_id });
    } else if (m.status === "played") {
      cover(m.a, m.round_id);
      cover(m.b, m.round_id);
    }
  }
  const finishers = roundIds.length
    ? [...covered.entries()].filter(([, rounds]) => roundIds.every((r) => rounds.has(r))).map(([key]) => names.get(key)!)
    : [];
  return { finishers: finishers.sort((x, y) => x.localeCompare(y, "hu")), byes };
}
