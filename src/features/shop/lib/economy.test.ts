import { describe, expect, it } from "vitest";
import { DEFAULT_ECONOMY, economyFromRows, pickSpin, questionReward, spinEv, spinTableProblems } from "./economy";

/** Deterministic pseudo-random numbers for repeatable statistics (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return (max: number) => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

describe("spin table", () => {
  it("the default table is valid and its expected value is about 0.76", () => {
    expect(spinTableProblems(DEFAULT_ECONOMY.spinTable)).toEqual([]);
    expect(spinEv(DEFAULT_ECONOMY.spinTable)).toBeCloseTo(0.76, 2);
  });

  it("refuses chances that don't add up to 100%", () => {
    const table = DEFAULT_ECONOMY.spinTable.map((p, i) => (i === 0 ? { ...p, chance: 50 } : p));
    expect(spinTableProblems(table).join(" ")).toMatch(/98%/);
  });

  it("refuses bad rows", () => {
    expect(spinTableProblems([{ label: "", chance: 50, coins: 1 }, { label: "B", chance: 50, coins: -1 }])).toHaveLength(2);
    expect(spinTableProblems([{ label: "A", chance: 33.333, coins: 1 }, { label: "B", chance: 66.667, coins: 1 }])).not.toEqual([]);
    expect(spinTableProblems([{ label: "A", chance: 100, coins: 1 }])).not.toEqual([]);
    expect(spinTableProblems("nope")).not.toEqual([]);
  });

  it("pickSpin maps every ticket to its prize", () => {
    const t = DEFAULT_ECONOMY.spinTable;
    expect(pickSpin(t, () => 0)).toBe(0); // 0–5199: Semmi
    expect(pickSpin(t, () => 5199)).toBe(0);
    expect(pickSpin(t, () => 5200)).toBe(1); // Kicsi
    expect(pickSpin(t, () => 9969)).toBe(4); // Szép ends at 9969
    expect(pickSpin(t, () => 9970)).toBe(5); // Főnyeremény: the last 30
    expect(pickSpin(t, () => 9999)).toBe(5);
  });

  it("matches the table over 100 000 spins (spec acceptance criterion 3)", () => {
    const t = DEFAULT_ECONOMY.spinTable;
    const counts = new Array(t.length).fill(0);
    const rnd = seeded(20261103);
    const n = 100_000;
    for (let i = 0; i < n; i++) counts[pickSpin(t, rnd)]++;
    t.forEach((p, i) => {
      const expected = (p.chance / 100) * n;
      const sd = Math.sqrt(n * (p.chance / 100) * (1 - p.chance / 100));
      expect(Math.abs(counts[i] - expected)).toBeLessThan(5 * sd + 1);
    });
  });
});

describe("economyFromRows", () => {
  it("uses defaults for missing or broken values", () => {
    const e = economyFromRows([
      { key: "ticket_price", value: 4000 },
      { key: "daily_game_reward_hard", value: -5 },
      { key: "spin_table", value: [{ label: "A", chance: 10, coins: 1 }] },
      { key: "daily_type_schedule", value: ["trivia"] },
    ]);
    expect(e.ticketPrice).toBe(4000);
    expect(e.dailyRewardHard).toBe(DEFAULT_ECONOMY.dailyRewardHard);
    expect(e.spinTable).toEqual(DEFAULT_ECONOMY.spinTable);
    expect(e.dailyTypeSchedule).toEqual(DEFAULT_ECONOMY.dailyTypeSchedule);
  });

  it("questionReward: override, else by difficulty", () => {
    expect(questionReward({ difficulty: "normal", reward_override: null }, DEFAULT_ECONOMY)).toBe(1);
    expect(questionReward({ difficulty: "hard", reward_override: null }, DEFAULT_ECONOMY)).toBe(2);
    expect(questionReward({ difficulty: "hard", reward_override: 7 }, DEFAULT_ECONOMY)).toBe(7);
  });
});
