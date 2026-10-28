import { describe, expect, it } from "vitest";
import { planSwap, type SwapMatch } from "./swap";

const round: SwapMatch[] = [
  { id: "m1", table_no: 1, player_a_id: "dave", player_b_id: "zen", status: "pending" },
  { id: "m2", table_no: 2, player_a_id: "subi", player_b_id: "bence", status: "confirmed" },
  { id: "m3", table_no: 3, player_a_id: "alice", player_b_id: "laci", status: "played" },
  { id: "m4", table_no: 4, player_a_id: "moi", player_b_id: null, status: "bye" },
];

describe("planSwap", () => {
  it("brings in a new player and removes their Bye", () => {
    expect(planSwap(round, "m1", "b", "moi", false)).toEqual({
      ok: true,
      replacedId: "zen",
      removeByeMatchId: "m4",
      addByeFor: null,
      nextTableNo: 5,
    });
  });

  it("can give the replaced player a Bye", () => {
    expect(planSwap(round, "m2", "a", "newbie", true)).toMatchObject({
      ok: true,
      replacedId: "subi",
      removeByeMatchId: null,
      addByeFor: "subi",
    });
  });

  it("rejects a player who already has a real match this round", () => {
    expect(planSwap(round, "m1", "b", "subi", false)).toEqual({
      ok: false,
      error: "Ez a játékos már játszik ebben a fordulóban (2. asztal).",
    });
  });

  it("rejects played and Bye matches, the same player and self-play", () => {
    expect(planSwap(round, "m3", "a", "newbie", false)).toMatchObject({ ok: false });
    expect(planSwap(round, "m4", "a", "newbie", false)).toMatchObject({ ok: false });
    expect(planSwap(round, "m1", "a", "dave", false)).toMatchObject({ ok: false });
    expect(planSwap(round, "m1", "a", "zen", false)).toMatchObject({ ok: false });
  });
});
