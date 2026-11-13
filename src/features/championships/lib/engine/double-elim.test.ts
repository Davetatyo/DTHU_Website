import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { generateDoubleElimination } from "./double-elim";
import type { Participant } from "./types";

function makePlayers(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
}

describe("generateDoubleElimination", () => {
  it("returns empty for fewer than 2 players", () => {
    expect(generateDoubleElimination([], { seed: "x" })).toEqual([]);
    expect(generateDoubleElimination([{ id: "p1" }], { seed: "x" })).toEqual([]);
  });

  it("4 players: has winners, losers and final brackets", () => {
    const matches = generateDoubleElimination(makePlayers(4), { seed: "s" });
    expect(matches.some((m) => m.bracket === "winners")).toBe(true);
    expect(matches.some((m) => m.bracket === "losers")).toBe(true);
    expect(matches.some((m) => m.bracket === "final")).toBe(true);
  });

  it("all winnerTo targets exist", () => {
    const matches = generateDoubleElimination(makePlayers(8), { seed: "s" });
    for (const m of matches) {
      if (m.winnerTo) {
        expect(matches.some((x) => x.key === m.winnerTo!.key)).toBe(true);
      }
    }
  });

  it("all loserTo targets exist", () => {
    const matches = generateDoubleElimination(makePlayers(8), { seed: "s" });
    for (const m of matches) {
      if (m.loserTo) {
        expect(matches.some((x) => x.key === m.loserTo!.key)).toBe(true);
      }
    }
  });

  it("byes do not send a loser to the losers bracket", () => {
    const matches = generateDoubleElimination(makePlayers(5), { seed: "s" });
    const byes = matches.filter((m) => m.autoAdvance);
    for (const m of byes) {
      // A bye match should not have sent a player into the losers bracket
      if (m.loserTo) {
        const target = matches.find((x) => x.key === m.loserTo!.key);
        if (target) {
          // The slot should not have been filled by this bye
          const slot = m.loserTo.slot;
          const filled = slot === 1 ? target.p1 : target.p2;
          expect(filled).toBeNull();
        }
      }
    }
  });

  it("grand final reset: two final matches exist", () => {
    const matches = generateDoubleElimination(makePlayers(4), { seed: "s", grandFinalReset: true });
    const finals = matches.filter((m) => m.bracket === "final");
    expect(finals).toHaveLength(2);
    expect(finals[0].key).toBe("GF-r0-s0");
    expect(finals[1].key).toBe("GF-r1-s0");
  });

  it("no grand final reset: one final match", () => {
    const matches = generateDoubleElimination(makePlayers(4), { seed: "s", grandFinalReset: false });
    const finals = matches.filter((m) => m.bracket === "final");
    expect(finals).toHaveLength(1);
  });

  it("same seed produces identical output", () => {
    const a = generateDoubleElimination(makePlayers(8), { seed: "stable" });
    const b = generateDoubleElimination(makePlayers(8), { seed: "stable" });
    expect(a).toEqual(b);
  });

  it("property: no cycles in bracket links", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 16 }),
        fc.string({ minLength: 1 }),
        (n, seed) => {
          const matches = generateDoubleElimination(makePlayers(n), { seed });
          const byKey = new Map(matches.map((m) => [m.key, m]));

          for (const m of matches) {
            const visited = new Set<string>();
            let cur: string | undefined = m.winnerTo?.key;
            while (cur) {
              expect(visited.has(cur)).toBe(false);
              visited.add(cur);
              cur = byKey.get(cur)?.winnerTo?.key;
            }
          }
        },
      ),
      { numRuns: 15 },
    );
  });

  it("property: all link targets exist", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 16 }),
        fc.string({ minLength: 1 }),
        (n, seed) => {
          const matches = generateDoubleElimination(makePlayers(n), { seed });
          const keys = new Set(matches.map((m) => m.key));
          for (const m of matches) {
            if (m.winnerTo) expect(keys.has(m.winnerTo.key)).toBe(true);
            if (m.loserTo) expect(keys.has(m.loserTo.key)).toBe(true);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
