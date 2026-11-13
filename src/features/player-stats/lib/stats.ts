// Player statistics, pure logic. Built from confirmed Bajnokságok results only (match_reports
// with confirmed_at set): the Karnyx league records neither a winner nor the heroes played.
// Everything is computed when a page loads; there is no stats table (see the README).

export type GameOutcome = "win" | "draw" | "loss";

/** One finished championship game, seen from one player's side. */
export type StatGame = {
  matchId: string;
  /** When it was played (matches.played_at, else when the result was confirmed). */
  date: string;
  tournamentId: string;
  tournamentName: string;
  round: number;
  outcome: GameOutcome;
  /** The hero this player played (null if the report left it empty). */
  hero: string | null;
  opponentName: string;
  opponentHero: string | null;
  /** This player's hero the opponent banned. */
  bannedHero: string | null;
  hp: number;
  opponentHp: number;
};

/** A match as the stats need it: both sides' players plus the round's tournament name. */
export type StatMatchInput = {
  id: string;
  player_a_id: string;
  player_b_id: string | null;
  played_at: string | null;
  a: { karnyx_name: string } | null;
  b: { karnyx_name: string } | null;
  round: { number: number; tournament: { id: string; name: string } | null } | null;
};

/** The parts of a match report (public.match_reports) the stats read. */
export type StatReportInput = {
  outcome: "a" | "b" | "draw";
  hp_a: number;
  hp_b: number;
  pick_a: string | null;
  pick_b: string | null;
  ban_a: string | null;
  ban_b: string | null;
  confirmed_at: string | null;
};

/**
 * The game from the side of the player whose `players` rows are `myPlayerIds`. Null for a Bye,
 * a result that isn't confirmed yet, or a match the player isn't in.
 */
export function toStatGame(match: StatMatchInput, report: StatReportInput | null | undefined, myPlayerIds: ReadonlySet<string>): StatGame | null {
  if (!report?.confirmed_at || !match.player_b_id) return null;
  const side = myPlayerIds.has(match.player_a_id) ? "a" : myPlayerIds.has(match.player_b_id) ? "b" : null;
  if (!side) return null;
  const mine = side === "a";
  return {
    matchId: match.id,
    date: match.played_at ?? report.confirmed_at,
    tournamentId: match.round?.tournament?.id ?? "",
    tournamentName: match.round?.tournament?.name ?? "",
    round: match.round?.number ?? 0,
    outcome: report.outcome === "draw" ? "draw" : report.outcome === side ? "win" : "loss",
    hero: (mine ? report.pick_a : report.pick_b) || null,
    opponentName: (mine ? match.b?.karnyx_name : match.a?.karnyx_name) ?? "?",
    opponentHero: (mine ? report.pick_b : report.pick_a) || null,
    bannedHero: (mine ? report.ban_a : report.ban_b) || null,
    hp: mine ? report.hp_a : report.hp_b,
    opponentHp: mine ? report.hp_b : report.hp_a,
  };
}

export type Record3 = { games: number; wins: number; draws: number; losses: number; /** 0..1, null with no games */ winRate: number | null };

export type HeroRecord = Record3 & { hero: string };

export type PlayerStats<G extends StatGame = StatGame> = {
  total: Record3;
  /** Distinct championships with at least one finished game. */
  championships: number;
  /** Same result in a row, counted back from the latest game (null with no games). */
  currentStreak: { outcome: GameOutcome; length: number } | null;
  bestWinStreak: number;
  /** Heroes played, most played first. */
  heroes: HeroRecord[];
  /** Opponent heroes faced at least MIN_MATCHUP_GAMES times, best record first. */
  matchups: HeroRecord[];
  /** This player's heroes banned by opponents, most often first. */
  bans: { hero: string; count: number }[];
  /** Newest first. */
  games: G[];
};

/** A matchup needs this many games before it is shown, so one result doesn't mislead. */
export const MIN_MATCHUP_GAMES = 5;

function emptyRecord(): Record3 {
  return { games: 0, wins: 0, draws: 0, losses: 0, winRate: null };
}

function add(r: Record3, outcome: GameOutcome): void {
  r.games += 1;
  if (outcome === "win") r.wins += 1;
  else if (outcome === "draw") r.draws += 1;
  else r.losses += 1;
  r.winRate = r.wins / r.games;
}

/** Most games first, then the better win rate, then the name (stable for equal records). */
function byGames(x: HeroRecord, y: HeroRecord): number {
  return y.games - x.games || (y.winRate ?? 0) - (x.winRate ?? 0) || x.hero.localeCompare(y.hero);
}

function byWinRate(x: HeroRecord, y: HeroRecord): number {
  return (y.winRate ?? 0) - (x.winRate ?? 0) || y.games - x.games || x.hero.localeCompare(y.hero);
}

function heroTable(games: readonly StatGame[], pick: (g: StatGame) => string | null): HeroRecord[] {
  const map = new Map<string, HeroRecord>();
  for (const g of games) {
    const hero = pick(g);
    if (!hero) continue;
    let r = map.get(hero);
    if (!r) map.set(hero, (r = { hero, ...emptyRecord() }));
    add(r, g.outcome);
  }
  return [...map.values()];
}

export function computeStats<G extends StatGame>(input: G[]): PlayerStats<G> {
  // Newest first; the match id keeps games on the same date in a fixed order.
  const games = [...input].sort((x, y) => y.date.localeCompare(x.date) || x.matchId.localeCompare(y.matchId));

  const total = emptyRecord();
  for (const g of games) add(total, g.outcome);

  let currentStreak: PlayerStats<G>["currentStreak"] = null;
  if (games.length > 0) {
    let length = 0;
    while (length < games.length && games[length].outcome === games[0].outcome) length += 1;
    currentStreak = { outcome: games[0].outcome, length };
  }

  let bestWinStreak = 0;
  let run = 0;
  for (const g of [...games].reverse()) {
    run = g.outcome === "win" ? run + 1 : 0;
    bestWinStreak = Math.max(bestWinStreak, run);
  }

  const bans = new Map<string, number>();
  for (const g of games) if (g.bannedHero) bans.set(g.bannedHero, (bans.get(g.bannedHero) ?? 0) + 1);

  return {
    total,
    championships: new Set(games.map((g) => g.tournamentId)).size,
    currentStreak,
    bestWinStreak,
    heroes: heroTable(games, (g) => g.hero).sort(byGames),
    matchups: heroTable(games, (g) => g.opponentHero)
      .filter((r) => r.games >= MIN_MATCHUP_GAMES)
      .sort(byWinRate),
    bans: [...bans.entries()].map(([hero, count]) => ({ hero, count })).sort((x, y) => y.count - x.count || x.hero.localeCompare(y.hero)),
    games,
  };
}

/** 0.4125 → "41,3%" (Hungarian decimal comma); null → "–". */
export function formatWinRate(rate: number | null): string {
  if (rate === null) return "–";
  const pct = Math.round(rate * 1000) / 10;
  return `${String(pct).replace(".", ",")}%`;
}

/** "33 Gy · 2 D · 45 V" style parts, used in rows and tiles. */
export function recordLabel(r: Record3): string {
  return `${r.wins} Gy · ${r.draws} D · ${r.losses} V`;
}

const STREAK_WORD: Record<GameOutcome, string> = { win: "győzelem", draw: "döntetlen", loss: "vereség" };

/** { win, 3 } → "3 győzelem"; null → "–". */
export function streakLabel(streak: PlayerStats["currentStreak"]): string {
  return streak ? `${streak.length} ${STREAK_WORD[streak.outcome]}` : "–";
}
