import { describe, expect, it } from "vitest";
import { computeStats, formatWinRate, MIN_MATCHUP_GAMES, recordLabel, streakLabel, toStatGame, type GameOutcome, type StatGame, type StatMatchInput, type StatReportInput } from "./stats";

const match = (over: Partial<StatMatchInput> = {}): StatMatchInput => ({
  id: "m1",
  player_a_id: "pa",
  player_b_id: "pb",
  played_at: "2026-11-05T18:00:00Z",
  a: { karnyx_name: "Anna" },
  b: { karnyx_name: "Bence" },
  round: { number: 2, tournament: { id: "t1", name: "Őszi Kupa" } },
  ...over,
});

const report = (over: Partial<StatReportInput> = {}): StatReportInput => ({
  outcome: "a",
  hp_a: 12,
  hp_b: 0,
  pick_a: "Barbarian",
  pick_b: "Monk",
  ban_a: "Ninja",
  ban_b: "Paladin",
  confirmed_at: "2026-11-05T20:00:00Z",
  ...over,
});

let n = 0;
const game = (outcome: GameOutcome, over: Partial<StatGame> = {}): StatGame => {
  n += 1;
  return {
    matchId: `g${String(n).padStart(3, "0")}`,
    date: `2026-10-${String(n).padStart(2, "0")}T18:00:00Z`,
    tournamentId: "t1",
    tournamentName: "Kupa",
    round: 1,
    outcome,
    hero: "Barbarian",
    opponentName: "X",
    opponentHero: "Monk",
    bannedHero: null,
    hp: 0,
    opponentHp: 0,
    ...over,
  };
};

describe("toStatGame", () => {
  it("reads side A", () => {
    const g = toStatGame(match(), report(), new Set(["pa"]));
    expect(g).toMatchObject({
      outcome: "win",
      hero: "Barbarian",
      opponentName: "Bence",
      opponentHero: "Monk",
      bannedHero: "Ninja",
      hp: 12,
      opponentHp: 0,
      tournamentId: "t1",
      tournamentName: "Őszi Kupa",
      round: 2,
      date: "2026-11-05T18:00:00Z",
    });
  });

  it("reads side B, mirrored", () => {
    const g = toStatGame(match(), report(), new Set(["pb"]));
    expect(g).toMatchObject({ outcome: "loss", hero: "Monk", opponentName: "Anna", opponentHero: "Barbarian", bannedHero: "Paladin", hp: 0, opponentHp: 12 });
  });

  it("keeps a draw a draw for both sides", () => {
    expect(toStatGame(match(), report({ outcome: "draw" }), new Set(["pa"]))?.outcome).toBe("draw");
    expect(toStatGame(match(), report({ outcome: "draw" }), new Set(["pb"]))?.outcome).toBe("draw");
  });

  it("skips unconfirmed results, missing reports, byes and other players' matches", () => {
    expect(toStatGame(match(), report({ confirmed_at: null }), new Set(["pa"]))).toBeNull();
    expect(toStatGame(match(), null, new Set(["pa"]))).toBeNull();
    expect(toStatGame(match({ player_b_id: null, b: null }), report(), new Set(["pa"]))).toBeNull();
    expect(toStatGame(match(), report(), new Set(["zz"]))).toBeNull();
  });

  it("falls back to the confirmation time and treats empty picks as unknown", () => {
    const g = toStatGame(match({ played_at: null }), report({ pick_a: "", ban_a: null }), new Set(["pa"]));
    expect(g?.date).toBe("2026-11-05T20:00:00Z");
    expect(g?.hero).toBeNull();
    expect(g?.bannedHero).toBeNull();
  });
});

describe("computeStats", () => {
  it("is empty without games", () => {
    const s = computeStats([]);
    expect(s.total).toEqual({ games: 0, wins: 0, draws: 0, losses: 0, winRate: null });
    expect(s.currentStreak).toBeNull();
    expect(s.bestWinStreak).toBe(0);
    expect(s.championships).toBe(0);
    expect(s.heroes).toEqual([]);
  });

  it("counts the record, win rate (draws are games) and championships", () => {
    const s = computeStats([game("win"), game("win", { tournamentId: "t2" }), game("draw"), game("loss")]);
    expect(s.total).toMatchObject({ games: 4, wins: 2, draws: 1, losses: 1, winRate: 0.5 });
    expect(s.championships).toBe(2);
  });

  it("orders games newest first and counts streaks", () => {
    // Oldest → newest: W W W L W W
    const s = computeStats([game("win"), game("win"), game("win"), game("loss"), game("win"), game("win")]);
    expect(s.games[0].date > s.games[1].date).toBe(true);
    expect(s.currentStreak).toEqual({ outcome: "win", length: 2 });
    expect(s.bestWinStreak).toBe(3);
  });

  it("current streak can be losses", () => {
    const s = computeStats([game("win"), game("loss"), game("loss")]);
    expect(s.currentStreak).toEqual({ outcome: "loss", length: 2 });
    expect(s.bestWinStreak).toBe(1);
  });

  it("builds the hero table, most played first, skipping unknown heroes", () => {
    const s = computeStats([
      game("win", { hero: "Monk" }),
      game("loss", { hero: "Barbarian" }),
      game("win", { hero: "Barbarian" }),
      game("win", { hero: null }),
    ]);
    expect(s.heroes.map((h) => [h.hero, h.games, h.wins])).toEqual([
      ["Barbarian", 2, 1],
      ["Monk", 1, 1],
    ]);
  });

  it("shows matchups only from MIN_MATCHUP_GAMES games, best first", () => {
    const vs = (hero: string, wins: number, losses: number) => [
      ...Array.from({ length: wins }, () => game("win", { opponentHero: hero })),
      ...Array.from({ length: losses }, () => game("loss", { opponentHero: hero })),
    ];
    const s = computeStats([...vs("Ninja", 1, MIN_MATCHUP_GAMES - 1), ...vs("Monk", MIN_MATCHUP_GAMES, 0), ...vs("Treant", 1, 1)]);
    expect(s.matchups.map((m) => m.hero)).toEqual(["Monk", "Ninja"]);
  });

  it("counts bans", () => {
    const s = computeStats([game("win", { bannedHero: "Ninja" }), game("win", { bannedHero: "Ninja" }), game("win", { bannedHero: "Monk" })]);
    expect(s.bans).toEqual([
      { hero: "Ninja", count: 2 },
      { hero: "Monk", count: 1 },
    ]);
  });
});

describe("labels", () => {
  it("formats the win rate with a Hungarian comma", () => {
    expect(formatWinRate(33 / 80)).toBe("41,3%");
    expect(formatWinRate(0.5)).toBe("50%");
    expect(formatWinRate(null)).toBe("–");
  });

  it("formats record and streak", () => {
    expect(recordLabel({ games: 80, wins: 33, draws: 2, losses: 45, winRate: 0 })).toBe("33 Gy · 2 D · 45 V");
    expect(streakLabel({ outcome: "loss", length: 3 })).toBe("3 vereség");
    expect(streakLabel(null)).toBe("–");
  });
});
