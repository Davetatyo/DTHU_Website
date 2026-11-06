import { describe, expect, it } from "vitest";
import {
  isDecided,
  isStartDue,
  matchHistory,
  registrationBlocker,
  roundDeadline,
  stepAfterCompletedRound,
  validateHeroPicks,
} from "./rules";
import type { ChampionshipMatch, Registration } from "./types";

const HEROES = ["Barbarian", "Moon Elf", "Paladin", "Ninja"];

describe("validateHeroPicks", () => {
  it("accepts 3 different known heroes", () => {
    expect(validateHeroPicks(["Barbarian", "Ninja", "Paladin"], HEROES)).toEqual({
      ok: true,
      heroes: ["Barbarian", "Ninja", "Paladin"],
    });
  });
  it("rejects too few, duplicates and unknown heroes", () => {
    expect(validateHeroPicks(["Barbarian", "Ninja", ""], HEROES).ok).toBe(false);
    expect(validateHeroPicks(["Barbarian", "Barbarian", "Ninja"], HEROES).ok).toBe(false);
    expect(validateHeroPicks(["Barbarian", "Ninja", "Batman"], HEROES).ok).toBe(false);
  });
});

describe("isStartDue", () => {
  const now = new Date("2026-11-10T18:00:00Z");
  it("is due once the start time passed during registration", () => {
    expect(isStartDue({ status: "registration", starts_at: "2026-11-10T17:59:00Z" }, now)).toBe(true);
    expect(isStartDue({ status: "registration", starts_at: "2026-11-10T18:00:00Z" }, now)).toBe(true);
  });
  it("is not due early, without a time, or outside registration", () => {
    expect(isStartDue({ status: "registration", starts_at: "2026-11-10T18:01:00Z" }, now)).toBe(false);
    expect(isStartDue({ status: "registration", starts_at: null }, now)).toBe(false);
    expect(isStartDue({ status: "draft", starts_at: "2026-11-01T00:00:00Z" }, now)).toBe(false);
    expect(isStartDue({ status: "running", starts_at: "2026-11-01T00:00:00Z" }, now)).toBe(false);
  });
});

describe("registrationBlocker", () => {
  const reg = (locked: boolean): Registration => ({
    tournament_id: "t",
    profile_id: "p",
    karnyx_name: "x",
    heroes: [],
    locked_at: locked ? "2026-11-01T00:00:00Z" : null,
    created_at: "",
    updated_at: "",
  });
  it("allows edits while registration is open and the entry isn't locked", () => {
    expect(registrationBlocker("registration", null)).toBeNull();
    expect(registrationBlocker("registration", reg(false))).toBeNull();
  });
  it("blocks locked entries and closed registration", () => {
    expect(registrationBlocker("registration", reg(true))).not.toBeNull();
    expect(registrationBlocker("running", reg(false))).not.toBeNull();
    expect(registrationBlocker("draft", null)).not.toBeNull();
  });
});

describe("stepAfterCompletedRound", () => {
  const swiss = { format: "swiss" as const, auto_pairing: true, settings: {} };
  it("plays ceil(log2 n) Swiss rounds by default, then finishes", () => {
    expect(stepAfterCompletedRound(swiss, 1, 8)).toBe("next_round");
    expect(stepAfterCompletedRound(swiss, 2, 8)).toBe("next_round");
    expect(stepAfterCompletedRound(swiss, 3, 8)).toBe("finish");
  });
  it("respects a fixed round count and manual pairing", () => {
    expect(stepAfterCompletedRound({ ...swiss, settings: { rounds: 5 } }, 3, 8)).toBe("next_round");
    expect(stepAfterCompletedRound({ ...swiss, auto_pairing: false }, 1, 8)).toBe("wait");
    expect(stepAfterCompletedRound({ ...swiss, auto_pairing: false }, 3, 8)).toBe("finish");
  });
});

describe("isDecided / matchHistory", () => {
  const m = (over: Partial<ChampionshipMatch>): ChampionshipMatch =>
    ({ id: "m", round_id: "r1", player_a_id: "a", player_b_id: "b", status: "pending", winner_id: null, ...over }) as ChampionshipMatch;

  it("needs a winner; marking played alone is not enough", () => {
    expect(isDecided(m({ status: "played" }))).toBe(false);
    expect(isDecided(m({ status: "played", winner_id: "a" }))).toBe(true);
    expect(isDecided(m({ status: "bye", player_b_id: null }))).toBe(true);
  });

  it("maps played-without-winner to pending so it scores nothing", () => {
    const history = matchHistory([{ id: "r1", number: 2 }], [m({ status: "played" }), m({ winner_id: "b", status: "played" })]);
    expect(history.map((h) => [h.round, h.status, h.winner])).toEqual([
      [2, "pending", null],
      [2, "played", "b"],
    ]);
  });
});

describe("roundDeadline", () => {
  it("defaults to a week and honours round_days", () => {
    const from = new Date("2026-11-10T18:00:00Z");
    expect(roundDeadline({}, from).toISOString()).toBe("2026-11-17T18:00:00.000Z");
    expect(roundDeadline({ round_days: 3 }, from).toISOString()).toBe("2026-11-13T18:00:00.000Z");
  });
});
