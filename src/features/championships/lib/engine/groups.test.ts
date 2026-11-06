import { describe, expect, it } from "vitest";
import { generateGroups, seedPlayoffs } from "./groups";
import type { Participant, Standing } from "./types";

function makePlayers(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
}

describe("generateGroups", () => {
  it("returns empty for fewer than 2 players", () => {
    expect(generateGroups([], { groups: 2, seed: "x" })).toEqual({});
    expect(generateGroups([{ id: "p1" }], { groups: 2, seed: "x" })).toEqual({});
  });

  it("4 players into 2 groups: balanced sizes", () => {
    const groups = generateGroups(makePlayers(4), { groups: 2, seed: "s" });
    expect(Object.keys(groups).sort()).toEqual(["A", "B"]);
    expect(groups.A).toHaveLength(2);
    expect(groups.B).toHaveLength(2);
  });

  it("snake order: seed 1 and 2 in different groups", () => {
    const groups = generateGroups(makePlayers(8), { groups: 4, seed: "s" });
    const groupOf = new Map<string, string>();
    for (const [g, ps] of Object.entries(groups)) {
      for (const p of ps) groupOf.set(p.id, g);
    }
    // Seeds 1-4 should each be in a different group
    const g1 = groupOf.get("p1");
    const g2 = groupOf.get("p2");
    const g3 = groupOf.get("p3");
    const g4 = groupOf.get("p4");
    expect(new Set([g1, g2, g3, g4]).size).toBe(4);
  });

  it("groups differ by at most 1 player", () => {
    const groups = generateGroups(makePlayers(10), { groups: 3, seed: "s" });
    const sizes = Object.values(groups).map((g) => g.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it("skips dropped players", () => {
    const players: Participant[] = [
      { id: "p1", seed: 1 },
      { id: "p2", seed: 2, dropped: true },
      { id: "p3", seed: 3 },
      { id: "p4", seed: 4 },
    ];
    const groups = generateGroups(players, { groups: 2, seed: "s" });
    const allIds = Object.values(groups).flat().map((p) => p.id);
    expect(allIds).not.toContain("p2");
    expect(allIds).toHaveLength(3);
  });
});

describe("seedPlayoffs", () => {
  it("returns correct number of qualified players", () => {
    const groupStandings: Record<string, Standing[]> = {
      A: [
        { id: "p1", rank: 1, points: 3, wins: 3, draws: 0, losses: 0, buchholz: 0, gameDiff: 3 },
        { id: "p5", rank: 2, points: 2, wins: 2, draws: 0, losses: 1, buchholz: 0, gameDiff: 1 },
      ],
      B: [
        { id: "p2", rank: 1, points: 3, wins: 3, draws: 0, losses: 0, buchholz: 0, gameDiff: 3 },
        { id: "p6", rank: 2, points: 1, wins: 1, draws: 0, losses: 2, buchholz: 0, gameDiff: -1 },
      ],
    };
    const result = seedPlayoffs(groupStandings, 2);
    expect(result).toHaveLength(4);
  });

  it("group winners get top seeds", () => {
    const groupStandings: Record<string, Standing[]> = {
      A: [
        { id: "p1", rank: 1, points: 3, wins: 3, draws: 0, losses: 0, buchholz: 0, gameDiff: 3 },
        { id: "p3", rank: 2, points: 1, wins: 1, draws: 0, losses: 2, buchholz: 0, gameDiff: -1 },
      ],
      B: [
        { id: "p2", rank: 1, points: 2, wins: 2, draws: 0, losses: 1, buchholz: 0, gameDiff: 1 },
        { id: "p4", rank: 2, points: 0, wins: 0, draws: 0, losses: 3, buchholz: 0, gameDiff: -3 },
      ],
    };
    const result = seedPlayoffs(groupStandings, 2);
    // Winners should have seeds 1 and 2
    const winners = result.filter((p) => p.seed! <= 2);
    expect(winners.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  });

  it("runners-up are in reversed group order to cross with winners", () => {
    const groupStandings: Record<string, Standing[]> = {
      A: [
        { id: "p1", rank: 1, points: 3, wins: 3, draws: 0, losses: 0, buchholz: 0, gameDiff: 3 },
        { id: "p3", rank: 2, points: 1, wins: 1, draws: 0, losses: 2, buchholz: 0, gameDiff: -1 },
      ],
      B: [
        { id: "p2", rank: 1, points: 2, wins: 2, draws: 0, losses: 1, buchholz: 0, gameDiff: 1 },
        { id: "p4", rank: 2, points: 0, wins: 0, draws: 0, losses: 3, buchholz: 0, gameDiff: -3 },
      ],
    };
    const result = seedPlayoffs(groupStandings, 2);
    // Seed 1 = A winner (p1), Seed 2 = B winner (p2)
    // Seed 3 = B runner-up (p4, reversed), Seed 4 = A runner-up (p3, reversed)
    // This makes p1 (A-winner) face p4 (B-runner) in semis
    expect(result[0].id).toBe("p1");
    expect(result[1].id).toBe("p2");
    expect(result[2].id).toBe("p4");
    expect(result[3].id).toBe("p3");
  });
});
