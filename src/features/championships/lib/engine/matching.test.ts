import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { maxWeightMatching, type WeightedEdge } from "./matching";

/** Best total weight (and edge count) over every matching, by brute force. */
function bruteForce(n: number, edges: WeightedEdge[], maxCardinality: boolean): { size: number; weight: bigint } {
  const w = new Map<string, bigint>();
  for (const [i, j, wt] of edges) {
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (!w.has(key) || w.get(key)! < wt) w.set(key, wt);
  }
  let best = { size: 0, weight: BigInt(0) };
  const used = new Array(n).fill(false);
  const go = (v: number, size: number, weight: bigint) => {
    while (v < n && used[v]) v++;
    if (v >= n) {
      const better = maxCardinality
        ? size > best.size || (size === best.size && weight > best.weight)
        : weight > best.weight;
      if (better) best = { size, weight };
      return;
    }
    used[v] = true;
    go(v + 1, size, weight); // v stays single
    for (let u = v + 1; u < n; u++) {
      const wt = w.get(`${v}-${u}`);
      if (used[u] || wt === undefined) continue;
      used[u] = true;
      go(v + 1, size + 1, weight + wt);
      used[u] = false;
    }
    used[v] = false;
  };
  go(0, 0, BigInt(0));
  return best;
}

function evaluate(edges: WeightedEdge[], mate: number[]): { size: number; weight: bigint } {
  let size = 0;
  let weight = BigInt(0);
  mate.forEach((m, v) => {
    if (m > v) {
      expect(mate[m]).toBe(v);
      const wt = edges.filter(([i, j]) => (i === v && j === m) || (i === m && j === v)).reduce((a, [, , x]) => (x > a ? x : a), -BigInt(1));
      expect(wt).toBeGreaterThanOrEqual(BigInt(0));
      size++;
      weight += wt;
    }
  });
  return { size, weight };
}

describe("maxWeightMatching", () => {
  it("handles the trivial cases", () => {
    expect(maxWeightMatching([])).toEqual([]);
    expect(maxWeightMatching([[0, 1, BigInt(1)]])).toEqual([1, 0]);
    expect(maxWeightMatching([[1, 2, BigInt(10)], [2, 3, BigInt(11)]])).toEqual([-1, -1, 3, 2]);
  });

  it("prefers the heavier matching, or the larger one with maxCardinality", () => {
    const edges: WeightedEdge[] = [[1, 2, BigInt(5)], [2, 3, BigInt(11)], [3, 4, BigInt(5)]];
    expect(maxWeightMatching(edges)).toEqual([-1, -1, 3, 2, -1]);
    expect(maxWeightMatching(edges, true)).toEqual([-1, 2, 1, 4, 3]);
  });

  it("solves classic blossom cases", () => {
    // S-blossom and relabelling (from the mwmatching.py test suite).
    expect(maxWeightMatching([[1, 2, BigInt(8)], [1, 3, BigInt(9)], [2, 3, BigInt(10)], [3, 4, BigInt(7)]])).toEqual([-1, 2, 1, 4, 3]);
    expect(maxWeightMatching([[1, 2, BigInt(8)], [1, 3, BigInt(9)], [2, 3, BigInt(10)], [3, 4, BigInt(7)], [1, 6, BigInt(5)], [4, 5, BigInt(6)]])).toEqual([-1, 6, 3, 2, 5, 4, 1]);
    // T-blossom expansion.
    expect(
      maxWeightMatching([[1, 2, BigInt(23)], [1, 5, BigInt(22)], [1, 6, BigInt(15)], [2, 3, BigInt(25)], [3, 4, BigInt(22)], [4, 5, BigInt(25)], [4, 8, BigInt(14)], [5, 7, BigInt(13)]]),
    ).toEqual([-1, 6, 3, 2, 8, 7, 1, 5, 4]);
    // Nested S-blossom expanded and relabelled.
    expect(
      maxWeightMatching([[1, 2, BigInt(19)], [1, 3, BigInt(20)], [1, 8, BigInt(8)], [2, 3, BigInt(25)], [2, 4, BigInt(18)], [3, 5, BigInt(18)], [4, 5, BigInt(13)], [4, 7, BigInt(7)], [5, 6, BigInt(7)]]),
    ).toEqual([-1, 8, 3, 2, 7, 6, 5, 4, 1]);
    // Blossom with a nested blossom, expanded in a later stage.
    expect(
      maxWeightMatching([[1, 2, BigInt(45)], [1, 5, BigInt(45)], [2, 3, BigInt(50)], [3, 4, BigInt(45)], [4, 5, BigInt(50)], [1, 6, BigInt(30)], [3, 9, BigInt(35)], [4, 8, BigInt(35)], [5, 7, BigInt(26)], [9, 10, BigInt(5)]]),
    ).toEqual([-1, 6, 3, 2, 8, 7, 1, 5, 4, 10, 9]);
    expect(
      maxWeightMatching([[1, 2, BigInt(40)], [1, 3, BigInt(40)], [2, 3, BigInt(60)], [2, 4, BigInt(55)], [3, 5, BigInt(55)], [4, 5, BigInt(50)], [1, 8, BigInt(15)], [5, 7, BigInt(30)], [7, 6, BigInt(10)], [8, 10, BigInt(10)], [4, 9, BigInt(30)]]),
    ).toEqual([-1, 2, 1, 5, 9, 3, 7, 6, 10, 4, 8]);
  });

  it("property: matches brute force on random graphs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 9 }),
        fc.array(fc.tuple(fc.nat(8), fc.nat(8), fc.integer({ min: 0, max: 30 })), { minLength: 1, maxLength: 24 }),
        fc.boolean(),
        (n, raw, maxCard) => {
          const edges: WeightedEdge[] = raw
            .map(([i, j, w]) => [i % n, j % n, BigInt(w)] as const)
            .filter(([i, j]) => i !== j);
          if (edges.length === 0) return;
          const nv = Math.max(...edges.map(([i, j]) => Math.max(i, j))) + 1;
          const got = evaluate(edges, maxWeightMatching(edges, maxCard));
          const want = bruteForce(nv, edges, maxCard);
          if (maxCard) expect(got.size).toBe(want.size);
          expect(got.weight).toBe(want.weight);
        },
      ),
      { numRuns: 1500 },
    );
  });
});
