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
    // Full Buchholz: each counts their one opponent's 0.5 points.
    expect(byId.get("p1")).toMatchObject({ points: 0.5, draws: 1, wins: 0, losses: 0, hpDiff: 0, buchholz: 0.5 });
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

  it("Buchholz: the sum of all opponents' points, nothing cut", () => {
    const players = makePlayers(6);
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "played" },
      { round: 1, p1: "p3", p2: "p4", winner: "p3", status: "played" },
      { round: 1, p1: "p5", p2: "p6", winner: "p5", status: "played" },
      { round: 2, p1: "p1", p2: "p3", winner: "p1", status: "played" },
      { round: 2, p1: "p5", p2: "p2", winner: "p5", status: "played" },
      { round: 2, p1: "p4", p2: "p6", winner: "p4", status: "played" },
      { round: 3, p1: "p1", p2: "p5", winner: "p5", status: "played" },
      { round: 3, p1: "p3", p2: "p6", winner: "p3", status: "played" },
      { round: 3, p1: "p2", p2: "p4", winner: "p2", status: "played" },
    ];
    // Points: p1 2, p2 1, p3 2, p4 1, p5 3, p6 0.
    const byId = new Map(standings(players, history).map((s) => [s.id, s]));
    // p1 met p2 (1), p3 (2), p5 (3): 6.
    expect(byId.get("p1")!.buchholz).toBe(6);
    // p3 met p4 (1), p1 (2), p6 (0): 3.
    expect(byId.get("p3")!.buchholz).toBe(3);
  });

  it("a Bye counts as an opponent with the player's own points (FIDE C.07 16.4)", () => {
    const players = makePlayers(3);
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "played" },
      { round: 1, p1: "p3", p2: null, winner: "p3", status: "bye" },
      { round: 2, p1: "p1", p2: "p3", winner: "p3", status: "played" },
      { round: 2, p1: "p2", p2: null, winner: "p2", status: "bye" },
    ];
    // p3 (2 points): Bye (counts as 2) + p1 (1) = 3. p1: p2 (1, from its Bye) + p3 (2) = 3.
    const byId = new Map(standings(players, history).map((s) => [s.id, s]));
    expect(byId.get("p3")!.buchholz).toBe(3);
    expect(byId.get("p1")!.buchholz).toBe(3);
  });

  it("a dropped player's points still count for their opponents", () => {
    const players: Participant[] = [{ id: "p1", seed: 1 }, { id: "p2", seed: 2, dropped: true }, { id: "p3", seed: 3 }, { id: "p4", seed: 4 }];
    const history: MatchResult[] = [
      { round: 1, p1: "p2", p2: "p4", winner: "p2", status: "played" },
      { round: 1, p1: "p1", p2: "p3", winner: "p1", status: "played" },
      { round: 2, p1: "p1", p2: "p2", winner: "p1", status: "played" },
      { round: 2, p1: "p3", p2: "p4", winner: "p3", status: "played" },
    ];
    const byId = new Map(standings(players, history).map((s) => [s.id, s]));
    expect(byId.has("p2")).toBe(false);
    // p1 met p3 (1) and p2 (1, dropped): 2.
    expect(byId.get("p1")!.buchholz).toBe(2);
  });

  it("uses the championship's scoring, Bye included", () => {
    const scoring = { win: 3, draw: 1, loss: 0, bye: 2 };
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "played" },
      { round: 1, p1: "p3", p2: "p4", winner: null, status: "draw" },
      { round: 1, p1: "p5", p2: null, winner: "p5", status: "bye" },
    ];
    const byId = new Map(standings(makePlayers(5), history, scoring).map((s) => [s.id, s]));
    expect([1, 2, 3, 4, 5].map((i) => byId.get(`p${i}`)!.points)).toEqual([3, 0, 1, 1, 2]);
  });

  it("HP difference: + the winner's HP for the winner, − the same for the loser; the loser's HP is ignored", () => {
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "played", hpA: 12, hpB: 0 },
      { round: 1, p1: "p3", p2: "p4", winner: "p4", status: "played", hpA: 20, hpB: 5 }, // p3 conceded on 20
      { round: 2, p1: "p1", p2: "p4", winner: null, status: "draw", hpA: 0, hpB: 0 },
    ];
    const byId = new Map(standings(makePlayers(4), history).map((s) => [s.id, s]));
    expect(byId.get("p1")!.hpDiff).toBe(12);
    expect(byId.get("p2")!.hpDiff).toBe(-12);
    expect(byId.get("p3")!.hpDiff).toBe(-5);
    expect(byId.get("p4")!.hpDiff).toBe(5);
  });

  it("order: points, then Buchholz, then HP difference", () => {
    // p1 and p2 both 2 points with the same opponents' strength; p1 won with more HP left.
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p3", winner: "p1", status: "played", hpA: 30, hpB: 0 },
      { round: 1, p1: "p2", p2: "p4", winner: "p2", status: "played", hpA: 2, hpB: 0 },
      { round: 2, p1: "p1", p2: "p4", winner: "p1", status: "played", hpA: 25, hpB: 0 },
      { round: 2, p1: "p2", p2: "p3", winner: "p2", status: "played", hpA: 3, hpB: 0 },
    ];
    const tableHp = standings(makePlayers(4), history);
    expect(tableHp.slice(0, 2).map((s) => s.id)).toEqual(["p1", "p2"]);
    expect(tableHp[0].buchholz).toBe(tableHp[1].buchholz);

    // Buchholz outranks HP: p2 now met a stronger opponent (p5 with a win) and passes p1.
    const withStrong: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p3", winner: "p1", status: "played", hpA: 30, hpB: 0 },
      { round: 1, p1: "p2", p2: "p4", winner: "p2", status: "played", hpA: 1, hpB: 0 },
      { round: 1, p1: "p5", p2: "p6", winner: "p5", status: "played", hpA: 1, hpB: 0 },
      { round: 2, p1: "p1", p2: "p6", winner: "p1", status: "played", hpA: 30, hpB: 0 },
      { round: 2, p1: "p2", p2: "p5", winner: "p2", status: "played", hpA: 1, hpB: 0 },
      { round: 2, p1: "p3", p2: "p4", winner: "p3", status: "played", hpA: 1, hpB: 0 },
    ];
    // p1: opponents p3 (1), p6 (0) → 1. p2: p4 (0), p5 (1) → 1. Tied: add a third round.
    withStrong.push(
      { round: 3, p1: "p1", p2: "p4", winner: "p1", status: "played", hpA: 30, hpB: 0 },
      { round: 3, p1: "p2", p2: "p3", winner: "p2", status: "played", hpA: 1, hpB: 0 },
      { round: 3, p1: "p5", p2: "p6", winner: "p5", status: "played", hpA: 1, hpB: 0 },
    );
    // Points: p1 3, p2 3, p3 1, p4 0, p5 2, p6 0.
    // p1: p3 (1) + p6 (0) + p4 (0) = 1. p2: p4 (0) + p5 (2) + p3 (1) = 3.
    const table = standings(makePlayers(6), withStrong);
    expect(table[0].id).toBe("p2");
    expect(table[1].id).toBe("p1");
    expect(table[1].hpDiff).toBeGreaterThan(table[0].hpDiff);
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
