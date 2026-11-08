import { describe, expect, it } from "vitest";
import { tournamentFinishers } from "./finishers";
import { isValidCurve, levelCost, levelInfo, levelStart, levelsReached } from "./levels";
import { activityLabel, isValidAdjustment, nextRewardLevel, rewardForLevel } from "./rules";

describe("level curve (25, +20 a level)", () => {
  it("starts at level 0 and costs 25, 45, 65…", () => {
    expect([0, 1, 2, 3].map((l) => levelCost(l))).toEqual([25, 45, 65, 85]);
    expect(levelInfo(0).level).toBe(0);
  });

  it("the site tutorial's 25 XP is exactly level 1", () => {
    expect(levelInfo(24).level).toBe(0);
    expect(levelInfo(25).level).toBe(1);
  });

  it("level 20 needs 4,300 XP, level 5 325 and level 7 595", () => {
    expect(levelStart(20)).toBe(4300);
    expect(levelStart(5)).toBe(325);
    expect(levelStart(7)).toBe(595);
  });

  it("reports progress inside a level", () => {
    expect(levelInfo(380)).toEqual({ level: 5, total: 380, from: 325, to: 450, into: 55, need: 70, pct: 44 });
  });

  it("follows another curve when an admin changes it", () => {
    expect(levelInfo(25 + 40, { first: 25, step: 15 }).level).toBe(2);
  });

  it("lists every level crossed at once", () => {
    expect(levelsReached(300, 600)).toEqual([5, 6, 7]);
    expect(levelsReached(380, 400)).toEqual([]);
  });

  it("only accepts sensible curves", () => {
    expect(isValidCurve({ first: 25, step: 20 })).toBe(true);
    expect(isValidCurve({ first: 0, step: 20 })).toBe(false);
    expect(isValidCurve({ first: 25, step: 7 })).toBe(false);
  });
});

describe("rules", () => {
  it("knows the level rewards: Barbár at 5, Holdtündé at 7", () => {
    expect(rewardForLevel(5)?.id).toBe("level-barbarian");
    expect(rewardForLevel(7)?.id).toBe("level-moon-elf");
    expect(rewardForLevel(6)).toBeNull();
    expect(nextRewardLevel(0)).toBe(5);
    expect(nextRewardLevel(5)).toBe(7);
    expect(nextRewardLevel(7)).toBeNull();
  });

  it("labels rows, with an admin's reason for hand-given XP", () => {
    expect(activityLabel("tournament_game")).toBe("Lejátszott meccs");
    expect(activityLabel("admin_manual", "Teszt")).toBe("Teszt");
  });

  it("only accepts hand-given amounts in steps of 5", () => {
    expect(isValidAdjustment(25)).toBe(true);
    expect(isValidAdjustment(-50)).toBe(true);
    expect(isValidAdjustment(0)).toBe(false);
    expect(isValidAdjustment(7)).toBe(false);
    expect(isValidAdjustment(5000)).toBe(false);
  });
});

describe("tournamentFinishers", () => {
  const rounds = ["r1", "r2", "r3"];

  it("counts players who played or had a Bye in every round", () => {
    const result = tournamentFinishers(rounds, [
      { round_id: "r1", status: "played", a: "Anna", b: "Bence" },
      { round_id: "r1", status: "bye", a: "Csaba", b: null },
      { round_id: "r2", status: "played", a: "Anna", b: "Csaba" },
      { round_id: "r2", status: "played", a: "Bence", b: "Dóra" },
      { round_id: "r3", status: "played", a: "Anna", b: "Bence" },
      { round_id: "r3", status: "confirmed", a: "Csaba", b: "Dóra" },
    ]);
    expect(result.finishers).toEqual(["Anna", "Bence"]);
    expect(result.byes).toEqual([{ name: "Csaba", roundId: "r1" }]);
  });

  it("matches names regardless of case", () => {
    const result = tournamentFinishers(["r1", "r2"], [
      { round_id: "r1", status: "played", a: "dave", b: "Ashimar" },
      { round_id: "r2", status: "played", a: "Dave", b: "ashimar" },
    ]);
    expect(result.finishers).toHaveLength(2);
  });

  it("has no finishers without rounds", () => {
    expect(tournamentFinishers([], []).finishers).toEqual([]);
  });
});
