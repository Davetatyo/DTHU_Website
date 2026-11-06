import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { generateSingleElimination } from "./single-elim";
import type { Participant } from "./types";

function makePlayers(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
}

describe("generateSingleElimination", () => {
  it("returns empty for fewer than 2 players", () => {
    expect(generateSingleElimination([], { seed: "x" })).toEqual([]);
    expect(generateSingleElimination([{ id: "p1" }], { seed: "x" })).toEqual([]);
  });

  it("2 players: 1 match, no byes", () => {
    const matches = generateSingleElimination(makePlayers(2), { seed: "s" });
    expect(matches).toHaveLength(1);
    expect(matches[0].p1).toBe("p1");
    expect(matches[0].p2).toBe("p2");
    expect(matches[0].autoAdvance).toBeUndefined();
  });

  it("4 players: 3 matches (2 semis + 1 final)", () => {
    const matches = generateSingleElimination(makePlayers(4), { seed: "s" });
    const winners = matches.filter((m) => m.bracket === "winners");
    expect(winners).toHaveLength(3);
    expect(winners.filter((m) => m.round === 0)).toHaveLength(2);
    expect(winners.filter((m) => m.round === 1)).toHaveLength(1);
  });

  it("seeds 1 and 2 are in opposite halves (8 players)", () => {
    const matches = generateSingleElimination(makePlayers(8), { seed: "s" });
    const r0 = matches.filter((m) => m.round === 0);
    const topHalf = r0.filter((m) => m.slot < 2);
    const topIds = topHalf.flatMap((m) => [m.p1, m.p2]).filter(Boolean);
    // Seed 1 in top, seed 2 in bottom (or vice versa, both valid)
    const s1InTop = topIds.includes("p1");
    const s2InTop = topIds.includes("p2");
    expect(s1InTop !== s2InTop).toBe(true);
  });

  it("byes go to the highest seeds (5 players)", () => {
    const matches = generateSingleElimination(makePlayers(5), { seed: "s" });
    // 8-slot bracket with 5 players = 3 empty slots in round 0.
    // Those 3 auto-advances propagate: when two byes feed into the same round-1
    // match, that match also auto-advances. Count only round-0 byes.
    const r0byes = matches.filter((m) => m.round === 0 && m.autoAdvance);
    expect(r0byes.length).toBe(3);
    for (const m of r0byes) {
      const seedNum = parseInt(m.autoAdvance!.replace("p", ""));
      expect(seedNum).toBeLessThanOrEqual(3);
    }
  });

  it("every winnerTo target exists", () => {
    const matches = generateSingleElimination(makePlayers(8), { seed: "s" });
    for (const m of matches) {
      if (m.winnerTo) {
        const target = matches.find((x) => x.key === m.winnerTo!.key);
        expect(target).toBeDefined();
      }
    }
  });

  it("third-place match links to semifinal losers", () => {
    const matches = generateSingleElimination(makePlayers(8), { seed: "s", thirdPlace: true });
    const tp = matches.find((m) => m.bracket === "third_place");
    expect(tp).toBeDefined();
    const semis = matches.filter((m) => m.bracket === "winners" && m.round === 1);
    expect(semis).toHaveLength(2);
    for (const sf of semis) {
      expect(sf.loserTo).toBeDefined();
      expect(sf.loserTo!.key).toBe(tp!.key);
    }
  });

  it("same seed produces identical output", () => {
    const a = generateSingleElimination(makePlayers(8), { seed: "stable" });
    const b = generateSingleElimination(makePlayers(8), { seed: "stable" });
    expect(a).toEqual(b);
  });

  it("property: bracket has N-1 matches for a full field", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 64 }),
        fc.string({ minLength: 1 }),
        (n, seed) => {
          const matches = generateSingleElimination(makePlayers(n), { seed });
          const size = nextPow2(n);
          const winnersOnly = matches.filter((m) => m.bracket === "winners");
          expect(winnersOnly).toHaveLength(size - 1);
        },
      ),
      { numRuns: 30 },
    );
  });

  it("property: all winnerTo targets exist", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 32 }),
        fc.string({ minLength: 1 }),
        (n, seed) => {
          const matches = generateSingleElimination(makePlayers(n), { seed });
          for (const m of matches) {
            if (m.winnerTo) {
              expect(matches.some((x) => x.key === m.winnerTo!.key)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
