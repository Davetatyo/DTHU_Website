import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { defaultSwissRounds, NO_CLEAN_PAIRING, nextSwissRound } from "./swiss";
import type { MatchResult, Pairing, Participant, Scoring } from "./types";

function makePlayers(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
}

const key = (a: string, b: string) => [a, b].sort().join("-");
const pairSet = (pairings: Pairing[]) => new Set(pairings.map((p) => (p.p2 ? key(p.p1, p.p2) : `${p.p1}-BYE`)));
const seedNo = (id: string) => Number(id.slice(1));
const betterSeed = (a: string, b: string) => (seedNo(a) < seedNo(b) ? a : b);

/** Plays a round where `winner` decides each match (null = draw); default: the better seed wins. */
function play(pairings: Pairing[], round: number, winner: (a: string, b: string) => string | null = betterSeed): MatchResult[] {
  return pairings.map((p): MatchResult => {
    if (!p.p2) return { round, p1: p.p1, p2: null, winner: p.p1, status: "bye" };
    const w = winner(p.p1, p.p2);
    return { round, p1: p.p1, p2: p.p2, winner: w, status: w ? "played" : "draw" };
  });
}

function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

/** Random results (about 10% draws) for `rounds` rounds. */
function runRounds(n: number, rounds: number, rng: () => number, scoring?: Scoring) {
  const players = makePlayers(n);
  let history: MatchResult[] = [];
  const warnings: string[] = [];
  for (let r = 1; r <= rounds; r++) {
    const out = nextSwissRound(players, history, { scoring });
    warnings.push(...out.warnings);
    history = [...history, ...play(out.pairings, r, (a, b) => (rng() < 0.1 ? null : rng() < 0.5 ? a : b))];
  }
  return { history, warnings };
}

// --- Brute force reference for the top Dutch criteria (default scoring) -----------------------

function pointsOf(history: MatchResult[]): Map<string, number> {
  const pts = new Map<string, number>();
  const add = (id: string, p: number) => pts.set(id, (pts.get(id) ?? 0) + p);
  for (const m of history) {
    if (!m.p2) add(m.p1, 1);
    else if (m.status === "draw") {
      add(m.p1, 0.5);
      add(m.p2, 0.5);
    } else if (m.winner) add(m.winner, 1);
  }
  return pts;
}

/**
 * What the Dutch rules rank first, as a comparable list: the Bye receiver's score group (lower is
 * better, so negated) and seed, then the number of floaters out of each score group, top first.
 */
function dutchKey(pairings: Pairing[], history: MatchResult[]): number[] {
  const pts = pointsOf(history);
  const p = (id: string) => pts.get(id) ?? 0;
  const ids = pairings.flatMap((x) => [x.p1, x.p2].filter(Boolean) as string[]);
  const groups = [...new Set(ids.map(p))].sort((a, b) => b - a);
  const byePlayer = pairings.find((x) => !x.p2)?.p1;
  const floaters = groups.map(() => 0);
  for (const x of pairings) {
    if (!x.p2 || p(x.p1) === p(x.p2)) continue;
    floaters[groups.indexOf(Math.max(p(x.p1), p(x.p2)))]++;
  }
  const byeKey = byePlayer ? [groups.indexOf(p(byePlayer)), seedNo(byePlayer)] : [];
  return [...byeKey.map((v) => -v), ...floaters];
}

/** The best dutchKey over every pairing with no rematch and no second Bye. */
function bruteForceBest(ids: string[], history: MatchResult[]): number[] | null {
  const met = new Set(history.filter((m) => m.p2).map((m) => key(m.p1, m.p2!)));
  const hadBye = new Set(history.filter((m) => !m.p2).map((m) => m.p1));
  let best: number[] | null = null;
  const less = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  };
  const pairUp = (left: string[], acc: Pairing[], byePairing: Pairing[]) => {
    if (left.length === 0) {
      const k = dutchKey([...acc, ...byePairing], history);
      if (!best || less(k, best)) best = k;
      return;
    }
    const [first, ...rest] = left;
    rest.forEach((other, i) => {
      if (met.has(key(first, other))) return;
      pairUp([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, { p1: first, p2: other }], byePairing);
    });
  };
  if (ids.length % 2 === 0) pairUp(ids, [], []);
  else {
    for (const b of ids) {
      if (!hadBye.has(b)) pairUp(ids.filter((x) => x !== b), [], [{ p1: b, p2: null }]);
    }
  }
  return best;
}

describe("defaultSwissRounds", () => {
  it("returns ceil(log2(N))", () => {
    expect(defaultSwissRounds(2)).toBe(1);
    expect(defaultSwissRounds(8)).toBe(3);
    expect(defaultSwissRounds(10)).toBe(4);
    expect(defaultSwissRounds(32)).toBe(5);
    expect(defaultSwissRounds(0)).toBe(1);
  });
});

describe("nextSwissRound (Dutch)", () => {
  it("returns nothing for fewer than 2 players", () => {
    expect(nextSwissRound([], []).pairings).toEqual([]);
    expect(nextSwissRound(makePlayers(1), []).pairings).toEqual([]);
  });

  it("round 1: top half plays bottom half by seed", () => {
    const { pairings } = nextSwissRound(makePlayers(8), []);
    expect(pairSet(pairings)).toEqual(new Set([key("p1", "p5"), key("p2", "p6"), key("p3", "p7"), key("p4", "p8")]));
  });

  it("round 1 with an odd field: the lowest seed gets the Bye", () => {
    const { pairings } = nextSwissRound(makePlayers(7), []);
    expect(pairSet(pairings)).toEqual(new Set([key("p1", "p4"), key("p2", "p5"), key("p3", "p6"), "p7-BYE"]));
  });

  it("round 2: winners play winners, losers play losers, Dutch order inside each group", () => {
    const players = makePlayers(8);
    const r1 = play(nextSwissRound(players, []).pairings, 1); // p1–p4 win
    const { pairings, warnings } = nextSwissRound(players, r1);
    expect(warnings).toEqual([]);
    expect(pairSet(pairings)).toEqual(new Set([key("p1", "p3"), key("p2", "p4"), key("p5", "p7"), key("p6", "p8")]));
  });

  it("an odd score group floats its lowest player down to the top of the next group", () => {
    const players = makePlayers(6);
    const r1 = play(nextSwissRound(players, []).pairings, 1); // p1–p4, p2–p5, p3–p6: p1, p2, p3 win
    const { pairings } = nextSwissRound(players, r1);
    // Winners {p1,p2,p3}: p1–p2, and p3 floats down to the top of the losers (p4), then p5–p6.
    expect(pairSet(pairings)).toEqual(new Set([key("p1", "p2"), key("p3", "p4"), key("p5", "p6")]));
  });

  it("doesn't float the same player down twice in a row when someone else can", () => {
    const players = makePlayers(6);
    const r1 = play(nextSwissRound(players, []).pairings, 1);
    const r2 = play(nextSwissRound(players, r1).pairings, 2); // p3 floated down in round 2
    // After round 2: p1 2, then p2, p3, p4 on 1, p5 1?, recompute generally: just check the rule.
    const pts = new Map<string, number>();
    for (const m of [...r1, ...r2]) if (m.winner) pts.set(m.winner, (pts.get(m.winner) ?? 0) + 1);
    const { pairings } = nextSwissRound(players, [...r1, ...r2]);
    const downfloaters = pairings
      .filter((p) => p.p2 && (pts.get(p.p1) ?? 0) !== (pts.get(p.p2) ?? 0))
      .map((p) => ((pts.get(p.p1) ?? 0) > (pts.get(p.p2!) ?? 0) ? p.p1 : p.p2!));
    expect(downfloaters).not.toContain("p3");
  });

  it("gives the Bye to the lowest player who hasn't had one", () => {
    const players = makePlayers(5);
    const r1 = play(nextSwissRound(players, []).pairings, 1); // p5 Bye; p1, p2 win
    const byePlayer = nextSwissRound(players, r1).pairings.find((p) => !p.p2)!.p1;
    expect(byePlayer).not.toBe("p5");
    expect(byePlayer).toBe("p4"); // the lowest of the 0-point group {p3, p4}
  });

  it("uses the championship's scoring for the score groups", () => {
    // A draw worth as much as a win puts the drawers into the winners' group.
    const scoring: Scoring = { win: 3, draw: 3, loss: 0, bye: 3 };
    const players = makePlayers(8);
    const r1: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p5", winner: "p1", status: "played" },
      { round: 1, p1: "p2", p2: "p6", winner: null, status: "draw" },
      { round: 1, p1: "p3", p2: "p7", winner: "p3", status: "played" },
      { round: 1, p1: "p4", p2: "p8", winner: "p8", status: "played" },
    ];
    const { pairings } = nextSwissRound(players, r1, { scoring });
    const top = new Set(["p1", "p2", "p3", "p6", "p8"]);
    const inside = pairings.filter((p) => p.p2 && top.has(p.p1) && top.has(p.p2));
    expect(inside).toHaveLength(2); // 5 on 3 points: two pairs inside, one floats down
    // With the default scoring the drawers (½ point) form their own group between the others,
    // and p8 (a winner) is the one who floats from the winners' group.
    const def = nextSwissRound(players, r1).pairings;
    const winners = new Set(["p1", "p3", "p8"]);
    expect(def.filter((p) => p.p2 && winners.has(p.p1) && winners.has(p.p2))).toHaveLength(1);
  });

  it("is deterministic", () => {
    const players = makePlayers(9);
    const r1 = play(nextSwissRound(players, []).pairings, 1);
    expect(nextSwissRound(players, r1)).toEqual(nextSwissRound(players, r1));
  });

  it("skips dropped players", () => {
    const players: Participant[] = [{ id: "p1", seed: 1 }, { id: "p2", seed: 2, dropped: true }, { id: "p3", seed: 3 }, { id: "p4", seed: 4 }];
    expect(nextSwissRound(players, []).pairings.flatMap((p) => [p.p1, p.p2])).not.toContain("p2");
  });

  it("never rematches: refuses the round when every pairing would repeat an opponent", () => {
    const players = makePlayers(4);
    let history: MatchResult[] = [];
    for (let r = 1; r <= 3; r++) {
      const out = nextSwissRound(players, history);
      expect(out.warnings).toEqual([]);
      history = [...history, ...play(out.pairings, r)];
    }
    const out = nextSwissRound(players, history); // everyone has met everyone
    expect(out.pairings).toEqual([]);
    expect(out.warnings).toEqual([NO_CLEAN_PAIRING]);
  });

  it("never gives a second Bye: refuses the round when only a repeat Bye would work", () => {
    // p1, p2, p3 never met each other (they played p4, who has dropped), but each already had a
    // Bye: pairs are possible, the Bye isn't.
    const players: Participant[] = [...makePlayers(3), { id: "p4", seed: 4, dropped: true }];
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: null, winner: "p1", status: "bye" },
      { round: 1, p1: "p2", p2: "p4", winner: "p2", status: "played" },
      { round: 2, p1: "p2", p2: null, winner: "p2", status: "bye" },
      { round: 2, p1: "p3", p2: "p4", winner: "p3", status: "played" },
      { round: 3, p1: "p3", p2: null, winner: "p3", status: "bye" },
      { round: 3, p1: "p1", p2: "p4", winner: "p1", status: "played" },
    ];
    expect(nextSwissRound(players, history)).toEqual({ pairings: [], warnings: [NO_CLEAN_PAIRING] });
  });

  it("avoids a second Bye even when that costs a float", () => {
    // 3 players: p3 had the Bye; the Bye must go to p1 or p2 although p3 is lowest.
    const players = makePlayers(3);
    const history: MatchResult[] = [
      { round: 1, p1: "p1", p2: "p2", winner: "p1", status: "played" },
      { round: 1, p1: "p3", p2: null, winner: "p3", status: "bye" },
    ];
    const { pairings } = nextSwissRound(players, history);
    expect(pairings.find((p) => !p.p2)!.p1).not.toBe("p3");
  });

  it("property: everyone paired exactly once, no rematch or second Bye in the default round count", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 30 }), fc.integer(), (n, seed) => {
        const rounds = defaultSwissRounds(n);
        const { history, warnings } = runRounds(n, rounds, lcg(seed));
        expect(warnings).toEqual([]);
        for (let r = 1; r <= rounds; r++) {
          const ids = history.filter((m) => m.round === r).flatMap((m) => [m.p1, m.p2].filter(Boolean));
          expect(ids).toHaveLength(n);
          expect(new Set(ids).size).toBe(n);
        }
        const seen = new Set<string>();
        const byes = new Set<string>();
        for (const m of history) {
          const k = m.p2 ? key(m.p1, m.p2) : m.p1;
          const set = m.p2 ? seen : byes;
          expect(set.has(k)).toBe(false);
          set.add(k);
        }
      }),
      { numRuns: 80 },
    );
  });

  it("property: matches brute force on the main Dutch rules (Bye, then floaters top group first)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 10 }), fc.integer({ min: 1, max: 3 }), fc.integer(), (n, before, seed) => {
        const players = makePlayers(n);
        const { history } = runRounds(n, before, lcg(seed));
        const { pairings, warnings } = nextSwissRound(players, history);
        const best = bruteForceBest(players.map((p) => p.id), history);
        if (best === null) {
          // No clean pairing exists: the engine must refuse, never fall back to a rematch.
          expect(pairings).toEqual([]);
          expect(warnings).toEqual([NO_CLEAN_PAIRING]);
          return;
        }
        expect(warnings).toEqual([]);
        expect(dutchKey(pairings, history)).toEqual(best);
      }),
      { numRuns: 150 },
    );
  });

  it("pairs a large field quickly", () => {
    const start = Date.now();
    const { warnings } = runRounds(64, 6, lcg(7));
    expect(warnings).toEqual([]);
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
