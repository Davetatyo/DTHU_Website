import { describe, expect, it } from "vitest";
import { fromGame, resultFor, toSideInput, type RelativeInput } from "./form";

const rel: RelativeInput = {
  my_hero: "Barbarian",
  opp_hero: "Moon Elf",
  my_hp: "7",
  opp_hp: "0",
  my_ult: "2",
  opp_ult: "",
  outcome: "me",
  played_at: "2026-11-14T18:30",
};

describe("toSideInput", () => {
  it("side a: mine goes to a", () => {
    expect(toSideInput(rel, "a")).toEqual({
      hero_a: "Barbarian",
      hero_b: "Moon Elf",
      hp_a: "7",
      hp_b: "0",
      ult_a: "2",
      ult_b: "",
      outcome: "a",
      played_at: "2026-11-14T18:30",
    });
  });

  it("side b: mirrored, and 'me' means b", () => {
    expect(toSideInput(rel, "b")).toMatchObject({ hero_a: "Moon Elf", hero_b: "Barbarian", hp_a: "0", hp_b: "7", ult_b: "2", outcome: "b" });
    expect(toSideInput({ ...rel, outcome: "opp" }, "b").outcome).toBe("a");
  });

  it("draw stays a draw, anything else is left for validation to reject", () => {
    expect(toSideInput({ ...rel, outcome: "draw" }, "a").outcome).toBe("draw");
    expect(toSideInput({ ...rel, outcome: "x" }, "a").outcome).toBe("");
  });
});

describe("fromGame", () => {
  const game = { hero_a: "Barbarian", hero_b: "Moon Elf", hp_a: 7, hp_b: 0, ult_a: 2, ult_b: null, outcome: "a" as const };

  it("round-trips through toSideInput from either side", () => {
    for (const side of ["a", "b"] as const) {
      const back = toSideInput(fromGame(game, side, "2026-11-14T18:30"), side);
      expect(back).toMatchObject({ hero_a: "Barbarian", hero_b: "Moon Elf", hp_a: "7", hp_b: "0", ult_a: "2", ult_b: "", outcome: "a" });
    }
  });

  it("phrases the result from the viewer's side", () => {
    expect(fromGame(game, "a", "").outcome).toBe("me");
    expect(fromGame(game, "b", "").outcome).toBe("opp");
  });
});

describe("resultFor", () => {
  it("win / loss / draw from a side; unknown for a spectator", () => {
    expect(resultFor({ outcome: "a" }, "a")).toBe("win");
    expect(resultFor({ outcome: "a" }, "b")).toBe("loss");
    expect(resultFor({ outcome: "draw" }, null)).toBe("draw");
    expect(resultFor({ outcome: "b" }, null)).toBeNull();
  });
});
