import { describe, expect, it } from "vitest";
import { matchResultColumns, reportRights, reportStatus, sameReport, validateReport, type ReportInput } from "./results";

const A = ["Barbarian", "Moon Elf", "Pyromancer"];
const B = ["Monk", "Paladin", "Ninja"];
const good: ReportInput = {
  outcome: "a",
  hp_a: "12",
  hp_b: "0",
  pick_a: "Barbarian",
  pick_b: "Monk",
  ban_a: "Moon Elf",
  ban_b: "Ninja",
};

describe("validateReport", () => {
  it("accepts a complete result", () => {
    const r = validateReport(good, A, B);
    expect(r).toEqual({
      ok: true,
      report: { outcome: "a", hp_a: 12, hp_b: 0, pick_a: "Barbarian", pick_b: "Monk", ban_a: "Moon Elf", ban_b: "Ninja" },
    });
  });

  it("needs a winner or a draw", () => {
    expect(validateReport({ ...good, outcome: "" }, A, B).ok).toBe(false);
  });

  it("rejects health outside 0-99 or not a whole number", () => {
    for (const hp of ["", "-1", "100", "4.5", "abc"]) {
      expect(validateReport({ ...good, hp_a: hp }, A, B).ok).toBe(false);
    }
  });

  it("a winner can't finish on 0 health, a draw can", () => {
    expect(validateReport({ ...good, hp_a: "0" }, A, B).ok).toBe(false);
    expect(validateReport({ ...good, outcome: "b", hp_a: "0", hp_b: "0" }, A, B).ok).toBe(false);
    expect(validateReport({ ...good, outcome: "draw", hp_a: "0", hp_b: "0" }, A, B).ok).toBe(true);
  });

  it("lets the loser keep health (conceded game)", () => {
    expect(validateReport({ ...good, hp_b: "20" }, A, B).ok).toBe(true);
  });

  it("picks and bans must be the player's own heroes", () => {
    expect(validateReport({ ...good, pick_a: "Monk" }, A, B).ok).toBe(false);
    expect(validateReport({ ...good, ban_b: "" }, A, B).ok).toBe(false);
  });

  it("the banned hero can't be the one played", () => {
    expect(validateReport({ ...good, ban_a: "Barbarian" }, A, B).ok).toBe(false);
  });

  it("skips picks for a player without heroes on record", () => {
    const r = validateReport({ ...good, pick_b: "", ban_b: "" }, A, []);
    expect(r.ok && r.report.pick_b).toBeNull();
  });
});

describe("reportRights", () => {
  const pendingByA = { submitted_side: "a" as const, confirmed_at: null };
  const locked = { submitted_side: "a" as const, confirmed_at: "2026-11-04T10:00:00Z" };

  it("a player can submit the first report", () => {
    expect(reportRights(null, { side: "a", admin: false })).toEqual({ canSubmit: true, canConfirm: false, locksOnSubmit: false });
  });

  it("only the opponent can confirm a pending report", () => {
    expect(reportRights(pendingByA, { side: "a", admin: false }).canConfirm).toBe(false);
    expect(reportRights(pendingByA, { side: "b", admin: false }).canConfirm).toBe(true);
  });

  it("the opponent can correct a pending report instead", () => {
    expect(reportRights(pendingByA, { side: "b", admin: false }).canSubmit).toBe(true);
  });

  it("a locked result is closed to players", () => {
    expect(reportRights(locked, { side: "b", admin: false })).toEqual({ canSubmit: false, canConfirm: false, locksOnSubmit: false });
  });

  it("admins change any result and their change locks", () => {
    expect(reportRights(locked, { side: null, admin: true })).toEqual({ canSubmit: true, canConfirm: false, locksOnSubmit: true });
    expect(reportRights(null, { side: null, admin: true }).locksOnSubmit).toBe(true);
  });

  it("an admin playing the match reports like a player until it's locked", () => {
    expect(reportRights(null, { side: "a", admin: true }).locksOnSubmit).toBe(false);
    expect(reportRights(locked, { side: "a", admin: true }).locksOnSubmit).toBe(true);
  });

  it("outsiders can do nothing", () => {
    expect(reportRights(pendingByA, { side: null, admin: false }).canSubmit).toBe(false);
  });
});

describe("helpers", () => {
  it("reportStatus", () => {
    expect(reportStatus(null)).toBe("none");
    expect(reportStatus({ confirmed_at: null })).toBe("pending");
    expect(reportStatus({ confirmed_at: "x" })).toBe("locked");
  });

  it("sameReport compares every field", () => {
    const r = validateReport(good, A, B);
    if (!r.ok) throw new Error();
    expect(sameReport(r.report, { ...r.report })).toBe(true);
    expect(sameReport(r.report, { ...r.report, hp_a: 11 })).toBe(false);
  });

  it("matchResultColumns", () => {
    const m = { player_a_id: "pa", player_b_id: "pb" };
    expect(matchResultColumns("a", m)).toEqual({ winner_id: "pa", is_draw: false });
    expect(matchResultColumns("b", m)).toEqual({ winner_id: "pb", is_draw: false });
    expect(matchResultColumns("draw", m)).toEqual({ winner_id: null, is_draw: true });
  });
});
