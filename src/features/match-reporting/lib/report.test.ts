import { describe, expect, it } from "vitest";
import { sameResult, validateGameResult, validateNewGame, type NewGameInput } from "./report";

const HEROES = ["Barbarian", "Moon Elf", "Pyromancer"];
const TZ = "Europe/Budapest";
// 2026-11-14 20:00 in Budapest (UTC+1).
const NOW = new Date("2026-11-14T19:00:00Z");
const opts = { heroNames: HEROES, timeZone: TZ, now: NOW };

const good: NewGameInput = {
  context: "ranked",
  opponent_id: "p2",
  hero_a: "Barbarian",
  hero_b: "Moon Elf",
  hp_a: "7",
  hp_b: "0",
  ult_a: "2",
  ult_b: "",
  outcome: "a",
  played_at: "2026-11-14T18:30",
};

describe("validateNewGame", () => {
  it("accepts a complete report and converts the time to UTC", () => {
    expect(validateNewGame(good, "p1", opts)).toEqual({
      ok: true,
      value: {
        context: "ranked",
        opponentId: "p2",
        fields: {
          hero_a: "Barbarian",
          hero_b: "Moon Elf",
          hp_a: 7,
          hp_b: 0,
          ult_a: 2,
          ult_b: null,
          outcome: "a",
          played_at: "2026-11-14T17:30:00.000Z",
        },
      },
    });
  });

  it("only casual or ranked", () => {
    expect(validateNewGame({ ...good, context: "casual" }, "p1", opts).ok).toBe(true);
    expect(validateNewGame({ ...good, context: "tournament" }, "p1", opts).ok).toBe(false);
    expect(validateNewGame({ ...good, context: "" }, "p1", opts).ok).toBe(false);
  });

  it("needs an opponent who isn't the reporter", () => {
    expect(validateNewGame({ ...good, opponent_id: " " }, "p1", opts).ok).toBe(false);
    expect(validateNewGame({ ...good, opponent_id: "p1" }, "p1", opts).ok).toBe(false);
  });
});

describe("validateGameResult", () => {
  it("heroes must come from the hero list", () => {
    expect(validateGameResult({ ...good, hero_b: "Nobody" }, opts).ok).toBe(false);
    expect(validateGameResult({ ...good, hero_a: "" }, opts).ok).toBe(false);
  });

  it("uses the shared outcome and health rules", () => {
    expect(validateGameResult({ ...good, hp_a: "0" }, opts).ok).toBe(false);
    expect(validateGameResult({ ...good, outcome: "draw", hp_a: "0", hp_b: "0" }, opts).ok).toBe(true);
    expect(validateGameResult({ ...good, hp_b: "100" }, opts).ok).toBe(false);
  });

  it("ultimates are optional whole numbers 0-20", () => {
    expect(validateGameResult({ ...good, ult_a: "", ult_b: "" }, opts).ok).toBe(true);
    expect(validateGameResult({ ...good, ult_a: "0" }, opts).ok).toBe(true);
    expect(validateGameResult({ ...good, ult_b: "20" }, opts).ok).toBe(true);
    for (const bad of ["21", "-1", "1.5", "x"]) expect(validateGameResult({ ...good, ult_a: bad }, opts).ok).toBe(false);
  });

  it("needs a valid time", () => {
    expect(validateGameResult({ ...good, played_at: "" }, opts).ok).toBe(false);
    expect(validateGameResult({ ...good, played_at: "tegnap" }, opts).ok).toBe(false);
  });

  it("at most 7 days back, not in the future (5 minutes slack)", () => {
    expect(validateGameResult({ ...good, played_at: "2026-11-07T20:00" }, opts).ok).toBe(true);
    expect(validateGameResult({ ...good, played_at: "2026-11-07T19:59" }, opts).ok).toBe(false);
    expect(validateGameResult({ ...good, played_at: "2026-11-14T20:05" }, opts).ok).toBe(true);
    expect(validateGameResult({ ...good, played_at: "2026-11-14T20:06" }, opts).ok).toBe(false);
  });

  it("a correction counts the 7 days from the first report", () => {
    const since = new Date("2026-11-12T19:00:00Z");
    expect(validateGameResult({ ...good, played_at: "2026-11-06T20:00" }, { ...opts, since }).ok).toBe(true);
    expect(validateGameResult({ ...good, played_at: "2026-11-05T19:59" }, { ...opts, since }).ok).toBe(false);
  });
});

describe("sameResult", () => {
  const game = {
    hero_a: "Barbarian",
    hero_b: "Moon Elf",
    hp_a: 7,
    hp_b: 0,
    ult_a: 2,
    ult_b: null,
    outcome: "a" as const,
    played_at: "2026-11-14T17:30:00+00:00",
  };
  const fields = { ...game, played_at: "2026-11-14T17:30:00.000Z" };

  it("compares times as instants, not text", () => {
    expect(sameResult(game, fields)).toBe(true);
  });

  it("any difference is a correction", () => {
    expect(sameResult(game, { ...fields, hp_a: 6 })).toBe(false);
    expect(sameResult(game, { ...fields, ult_b: 0 })).toBe(false);
    expect(sameResult(game, { ...fields, hero_b: "Pyromancer" })).toBe(false);
    expect(sameResult(game, { ...fields, played_at: "2026-11-14T17:31:00.000Z" })).toBe(false);
  });
});
