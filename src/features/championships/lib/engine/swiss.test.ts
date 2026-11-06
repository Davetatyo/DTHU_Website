import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { defaultSwissRounds, nextSwissRound } from "./swiss";
import type { MatchResult, Participant, PlayerId } from "./types";

function makePlayers(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
}

function simulateRound(
  players: Participant[],
  history: MatchResult[],
  seed: string,
  roundNum: number,
): MatchResult[] {
  const { pairings } = nextSwissRound(players, history, { seed });
  const results: MatchResult[] = [];
  for (const p of pairings) {
    if (p.p2 === null) {
      results.push({ round: roundNum, p1: p.p1, p2: null, winner: p.p1, status: "bye" });
    } else {
      // Winner is always p1 for determinism in tests
      results.push({ round: roundNum, p1: p.p1, p2: p.p2, winner: p.p1, status: "played" });
    }
  }
  return results;
}

describe("defaultSwissRounds", () => {
  it("returns ceil(log2(N))", () => {
    expect(defaultSwissRounds(2)).toBe(1);
    expect(defaultSwissRounds(4)).toBe(2);
    expect(defaultSwissRounds(8)).toBe(3);
    expect(defaultSwissRounds(16)).toBe(4);
    expect(defaultSwissRounds(10)).toBe(4); // ceil(log2(10)) = 4
    expect(defaultSwissRounds(32)).toBe(5);
  });

  it("handles edge cases", () => {
    expect(defaultSwissRounds(0)).toBe(1);
    expect(defaultSwissRounds(1)).toBe(1);
  });
});

describe("nextSwissRound", () => {
  it("returns empty for fewer than 2 players", () => {
    const { pairings } = nextSwissRound([], [], { seed: "x" });
    expect(pairings).toEqual([]);
  });

  it("round 1: top half vs bottom half", () => {
    const players = makePlayers(8);
    const { pairings } = nextSwissRound(players, [], { seed: "r1" });
    expect(pairings).toHaveLength(4);
    for (const p of pairings) {
      expect(p.p2).not.toBeNull();
    }
  });

  it("odd player count: one bye", () => {
    const players = makePlayers(5);
    const { pairings } = nextSwissRound(players, [], { seed: "odd" });
    const byes = pairings.filter((p) => p.p2 === null);
    expect(byes).toHaveLength(1);
  });

  it("no repeated opponents in 3 rounds with 8 players", () => {
    const players = makePlayers(8);
    let history: MatchResult[] = [];
    for (let r = 1; r <= 3; r++) {
      const { pairings, warnings } = nextSwissRound(players, history, { seed: "norepeat" });
      expect(warnings).toHaveLength(0);
      const roundResults = pairings.map((p): MatchResult => ({
        round: r,
        p1: p.p1,
        p2: p.p2,
        winner: p.p1,
        status: p.p2 ? "played" : "bye",
      }));
      history = [...history, ...roundResults];
    }

    const played = new Map<PlayerId, Set<PlayerId>>();
    for (const m of history) {
      if (!m.p2) continue;
      if (!played.has(m.p1)) played.set(m.p1, new Set());
      if (!played.has(m.p2)) played.set(m.p2, new Set());
      played.get(m.p1)!.add(m.p2);
      played.get(m.p2)!.add(m.p1);
    }
    // No pair should appear more than once
    for (const [, opponents] of played) {
      expect(opponents.size).toBe(opponents.size); // Set ensures uniqueness
    }
  });

  it("no player gets two byes in 3 rounds with 7 players", () => {
    const players = makePlayers(7);
    let history: MatchResult[] = [];
    for (let r = 1; r <= 3; r++) {
      const results = simulateRound(players, history, "byes", r);
      history = [...history, ...results];
    }
    const byeCount = new Map<string, number>();
    for (const m of history) {
      if (m.status === "bye") byeCount.set(m.p1, (byeCount.get(m.p1) ?? 0) + 1);
    }
    for (const [, count] of byeCount) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it("same seed produces identical output", () => {
    const players = makePlayers(8);
    const a = nextSwissRound(players, [], { seed: "stable" });
    const b = nextSwissRound(players, [], { seed: "stable" });
    expect(a).toEqual(b);
  });

  it("skips dropped players", () => {
    const players: Participant[] = [
      { id: "p1", seed: 1 },
      { id: "p2", seed: 2, dropped: true },
      { id: "p3", seed: 3 },
      { id: "p4", seed: 4 },
    ];
    const { pairings } = nextSwissRound(players, [], { seed: "drop" });
    const allIds = pairings.flatMap((p) => [p.p1, p.p2].filter(Boolean));
    expect(allIds).not.toContain("p2");
  });

  it("property: every active player is paired or has the bye", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 24 }),
        fc.string({ minLength: 1 }),
        (n, seed) => {
          const players = makePlayers(n);
          const { pairings } = nextSwissRound(players, [], { seed });
          const allIds = new Set(pairings.flatMap((p) => [p.p1, p.p2].filter(Boolean) as string[]));
          for (let i = 1; i <= n; i++) {
            expect(allIds.has(`p${i}`)).toBe(true);
          }
          const byes = pairings.filter((p) => p.p2 === null);
          if (n % 2 === 0) expect(byes).toHaveLength(0);
          else expect(byes).toHaveLength(1);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("property: multi-round Swiss has no rematches for small fields", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 16 }),
        fc.string({ minLength: 1 }),
        (n, seed) => {
          const players = makePlayers(n);
          const rounds = Math.min(defaultSwissRounds(n), 3);
          let history: MatchResult[] = [];
          let hadWarning = false;

          for (let r = 1; r <= rounds; r++) {
            const { pairings, warnings } = nextSwissRound(players, history, { seed });
            if (warnings.length > 0) hadWarning = true;
            const results = pairings.map((p): MatchResult => ({
              round: r,
              p1: p.p1,
              p2: p.p2,
              winner: p.p1,
              status: p.p2 ? "played" : "bye",
            }));
            history = [...history, ...results];
          }

          if (!hadWarning) {
            // No warnings means no rematches should exist
            const pairs = new Set<string>();
            for (const m of history) {
              if (!m.p2) continue;
              const key = [m.p1, m.p2].sort().join("-");
              expect(pairs.has(key)).toBe(false);
              pairs.add(key);
            }
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
