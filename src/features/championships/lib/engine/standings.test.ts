import { describe, expect, it } from "vitest";
import { standings } from "./standings";
import type { MatchResult, Participant } from "./types";

function makePlayers(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
}

describe("standings", () => {
  it("empty history: all players at 0", () => {
    const result = standings(makePlayers(4), []);
    expect(result).toHaveLength(4);
    for (const s of result) {
      expect(s.points).toBe(0);
      expect(s.wins).toBe(0);
      expect(s.losses).toBe(0);
    }
  });

  it("simple 3-player round: correct wins, losses, ranks", () => {
    const players = makePlayers(3);
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "played" },
      { round: 1, p1: "p3", p2: null, winner: "p3", status: "bye" },
      { round: 2, p1: "p1", p2: "p3", winner: "p3", status: "played" },
      { round: 2, p1: "p2", p2: null, winner: "p2", status: "bye" },
      { round: 3, p1: "p2", p2: "p3", winner: "p3", status: "played" },
      { round: 3, p1: "p1", p2: null, winner: "p1", status: "bye" },
    ];
    const result = standings(players, history);
    // p3: 3 points (1 bye + 2 wins), p1: 2 points (1 bye + 1 win), p2: 1 point (1 bye)
    expect(result[0].id).toBe("p3");
    expect(result[0].points).toBe(3);
    expect(result[1].id).toBe("p1");
    expect(result[1].points).toBe(2);
    expect(result[2].id).toBe("p2");
    expect(result[2].points).toBe(1);
  });

  it("a draw gives both players half a point and counts for Buchholz", () => {
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: null, status: "draw" },
      { round: 1, p1: "p3", p2: "p4", winner: "p3", status: "played" },
    ];
    const result = standings(makePlayers(4), history);
    const byId = new Map(result.map((s) => [s.id, s]));
    expect(byId.get("p1")).toMatchObject({ points: 0.5, draws: 1, wins: 0, losses: 0, gameDiff: 0, buchholz: 0.5 });
    expect(byId.get("p2")).toMatchObject({ points: 0.5, draws: 1, buchholz: 0.5 });
    expect(result.map((s) => s.id)).toEqual(["p3", "p1", "p2", "p4"]);
  });

  it("pending matches do not count", () => {
    const players = makePlayers(2);
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: null, status: "pending" },
    ];
    const result = standings(players, history);
    expect(result[0].points).toBe(0);
    expect(result[1].points).toBe(0);
  });

  it("dropped players are excluded", () => {
    const players: Participant[] = [
      { id: "p1", seed: 1 },
      { id: "p2", seed: 2, dropped: true },
      { id: "p3", seed: 3 },
    ];
    const result = standings(players, []);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).not.toContain("p2");
  });

  it("buchholz is sum of opponents' points", () => {
    const players = makePlayers(4);
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "played" },
      { round: 1, p1: "p3", p2: "p4", winner: "p3", status: "played" },
      { round: 2, p1: "p1", p2: "p3", winner: "p1", status: "played" },
      { round: 2, p1: "p2", p2: "p4", winner: "p2", status: "played" },
    ];
    const result = standings(players, history);
    const p1 = result.find((s) => s.id === "p1")!;
    // p1 beat p2 (1pt) and p3 (1pt) → buchholz = 2
    expect(p1.buchholz).toBe(2);
    expect(p1.points).toBe(2);
  });

  it("ranks are assigned in order", () => {
    const players = makePlayers(4);
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "played" },
      { round: 1, p1: "p3", p2: "p4", winner: "p4", status: "played" },
    ];
    const result = standings(players, history);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
    expect(result[2].rank).toBe(3);
    expect(result[3].rank).toBe(4);
  });

  it("forfeit counts as a win for the winner", () => {
    const players = makePlayers(2);
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "forfeit" },
    ];
    const result = standings(players, history);
    expect(result[0].id).toBe("p1");
    expect(result[0].points).toBe(1);
    expect(result[1].points).toBe(0);
  });
});
