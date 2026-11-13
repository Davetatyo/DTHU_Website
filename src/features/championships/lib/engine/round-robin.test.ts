import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { generateRoundRobin } from "./round-robin";
import type { Participant } from "./types";

function makePlayers(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
}

describe("generateRoundRobin", () => {
  it("returns empty for fewer than 2 players", () => {
    expect(generateRoundRobin([], { seed: "x" })).toEqual([]);
    expect(generateRoundRobin([{ id: "p1" }], { seed: "x" })).toEqual([]);
  });

  it("2 players: 1 round, 1 match", () => {
    const rounds = generateRoundRobin(makePlayers(2), { seed: "test" });
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toHaveLength(1);
    expect(rounds[0][0].p2).not.toBeNull();
  });

  it("4 players: 3 rounds, every pair meets exactly once", () => {
    const rounds = generateRoundRobin(makePlayers(4), { seed: "s" });
    expect(rounds).toHaveLength(3);
    const pairs = new Set<string>();
    for (const round of rounds) {
      for (const m of round) {
        if (m.p2) {
          const key = [m.p1, m.p2].sort().join("-");
          expect(pairs.has(key)).toBe(false);
          pairs.add(key);
        }
      }
    }
    // C(4,2) = 6 unique pairs
    expect(pairs.size).toBe(6);
  });

  it("odd player count: each player has exactly 1 bye per cycle", () => {
    const rounds = generateRoundRobin(makePlayers(5), { seed: "odd" });
    expect(rounds).toHaveLength(5); // 5 players → 6 slots → 5 rounds
    const byes = new Map<string, number>();
    for (const round of rounds) {
      for (const m of round) {
        if (m.p2 === null) {
          byes.set(m.p1, (byes.get(m.p1) ?? 0) + 1);
        }
      }
    }
    for (const [, count] of byes) {
      expect(count).toBe(1);
    }
    expect(byes.size).toBe(5);
  });

  it("double round robin: every pair meets exactly twice", () => {
    const rounds = generateRoundRobin(makePlayers(4), { seed: "dbl", double: true });
    expect(rounds).toHaveLength(6); // 3 + 3
    const pairCount = new Map<string, number>();
    for (const round of rounds) {
      for (const m of round) {
        if (m.p2) {
          const key = [m.p1, m.p2].sort().join("-");
          pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
        }
      }
    }
    for (const [, count] of pairCount) {
      expect(count).toBe(2);
    }
  });

  it("no player plays twice in the same round", () => {
    const rounds = generateRoundRobin(makePlayers(8), { seed: "nodup" });
    for (const round of rounds) {
      const seen = new Set<string>();
      for (const m of round) {
        expect(seen.has(m.p1)).toBe(false);
        seen.add(m.p1);
        if (m.p2) {
          expect(seen.has(m.p2)).toBe(false);
          seen.add(m.p2);
        }
      }
    }
  });

  it("same seed produces identical output", () => {
    const a = generateRoundRobin(makePlayers(6), { seed: "stable" });
    const b = generateRoundRobin(makePlayers(6), { seed: "stable" });
    expect(a).toEqual(b);
  });

  it("skips dropped players", () => {
    const players: Participant[] = [
      { id: "p1", seed: 1 },
      { id: "p2", seed: 2, dropped: true },
      { id: "p3", seed: 3 },
      { id: "p4", seed: 4 },
    ];
    const rounds = generateRoundRobin(players, { seed: "drop" });
    const allIds = new Set(rounds.flat().flatMap((m) => [m.p1, m.p2].filter(Boolean)));
    expect(allIds.has("p2")).toBe(false);
  });

  it("property: N even players → N-1 rounds, each pair meets once", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 32 }).filter((n) => n % 2 === 0),
        fc.string({ minLength: 1 }),
        (n, seed) => {
          const rounds = generateRoundRobin(makePlayers(n), { seed });
          expect(rounds).toHaveLength(n - 1);
          const pairs = new Set<string>();
          for (const round of rounds) {
            const seen = new Set<string>();
            for (const m of round) {
              expect(seen.has(m.p1)).toBe(false);
              seen.add(m.p1);
              if (m.p2) {
                expect(seen.has(m.p2)).toBe(false);
                seen.add(m.p2);
                const key = [m.p1, m.p2].sort().join("-");
                expect(pairs.has(key)).toBe(false);
                pairs.add(key);
              }
            }
          }
          expect(pairs.size).toBe((n * (n - 1)) / 2);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("property: odd N → each player gets exactly 1 bye", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 31 }).filter((n) => n % 2 !== 0),
        fc.string({ minLength: 1 }),
        (n, seed) => {
          const rounds = generateRoundRobin(makePlayers(n), { seed });
          const byes = new Map<string, number>();
          for (const round of rounds) {
            for (const m of round) {
              if (m.p2 === null) byes.set(m.p1, (byes.get(m.p1) ?? 0) + 1);
            }
          }
          for (let i = 1; i <= n; i++) {
            expect(byes.get(`p${i}`)).toBe(1);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
