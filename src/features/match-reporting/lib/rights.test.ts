import { describe, expect, it } from "vitest";
import { awaitingProfile, gameRights, gameSide } from "./rights";
import type { Game } from "./types";

type Ref = Pick<Game, "status" | "context" | "profile_a" | "profile_b" | "reported_side">;
const pending: Ref = { status: "pending", context: "ranked", profile_a: "A", profile_b: "B", reported_side: "a" };
const final: Ref = { ...pending, status: "finalized" };

const player = (id: string) => ({ id, admin: false });
const admin = (id: string) => ({ id, admin: true });

describe("gameSide / awaitingProfile", () => {
  it("finds the side and who has to answer", () => {
    expect(gameSide(pending, "A")).toBe("a");
    expect(gameSide(pending, "B")).toBe("b");
    expect(gameSide(pending, "C")).toBeNull();
    expect(awaitingProfile(pending)).toBe("B");
    expect(awaitingProfile({ ...pending, reported_side: "b" })).toBe("A");
    expect(awaitingProfile(final)).toBeNull();
  });
});

describe("gameRights", () => {
  it("pending: the reporter can cancel, the opponent can respond", () => {
    expect(gameRights(pending, player("A"))).toMatchObject({ canView: true, canRespond: false, canCancel: true });
    expect(gameRights(pending, player("B"))).toMatchObject({ canView: true, canRespond: true, canCancel: false });
  });

  it("after a correction the roles swap", () => {
    const corrected = { ...pending, reported_side: "b" as const };
    expect(gameRights(corrected, player("A")).canRespond).toBe(true);
    expect(gameRights(corrected, player("B")).canCancel).toBe(true);
  });

  it("pending games are private to the players and admins; final games are visible to everyone logged in", () => {
    expect(gameRights(pending, player("C")).canView).toBe(false);
    expect(gameRights(pending, admin("C")).canView).toBe(true);
    expect(gameRights(final, player("C")).canView).toBe(true);
    for (const status of ["cancelled", "expired", "voided"] as const) {
      expect(gameRights({ ...pending, status }, player("C")).canView).toBe(false);
      expect(gameRights({ ...pending, status }, player("A")).canView).toBe(true);
    }
  });

  it("an admin who played acts as a player while pending", () => {
    expect(gameRights(pending, admin("B"))).toMatchObject({ canRespond: true, canAdminEdit: false, canVoid: false });
    expect(gameRights(pending, admin("C"))).toMatchObject({ canRespond: false, canAdminEdit: true, canVoid: true });
  });

  it("final games: admins may edit or void (also their own), players nothing", () => {
    expect(gameRights(final, admin("A"))).toMatchObject({ canAdminEdit: true, canVoid: true });
    expect(gameRights(final, player("A"))).toMatchObject({ canRespond: false, canCancel: false, canAdminEdit: false, canVoid: false });
  });

  it("closed games can't be changed", () => {
    for (const status of ["cancelled", "expired", "voided"] as const) {
      const r = gameRights({ ...pending, status }, admin("C"));
      expect([r.canRespond, r.canCancel, r.canAdminEdit, r.canVoid]).toEqual([false, false, false, false]);
    }
  });

  it("championship games are read-only here", () => {
    const t = { ...final, context: "tournament" as const };
    expect(gameRights(t, admin("C"))).toMatchObject({ canView: true, canAdminEdit: false, canVoid: false });
    const tp = { ...pending, context: "tournament" as const };
    expect(gameRights(tp, player("B")).canRespond).toBe(false);
  });
});
