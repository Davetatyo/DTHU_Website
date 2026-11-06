import { describe, expect, it } from "vitest";
import { championshipAccess, homeChampionship } from "./access";

const player = { participant: true, admin: false };
const outsider = { participant: false, admin: false };
const admin = { participant: false, admin: true };

describe("championshipAccess", () => {
  it("everyone can sign up while registration is open", () => {
    expect(championshipAccess("registration", outsider)).toBe("signup");
    expect(championshipAccess("registration", player)).toBe("signup");
  });

  it("a running championship is full for its players and read-only for others", () => {
    expect(championshipAccess("running", player)).toBe("full");
    expect(championshipAccess("running", outsider)).toBe("readonly");
    expect(championshipAccess("running", admin)).toBe("readonly");
  });

  it("a finished championship is only for its players and admins", () => {
    expect(championshipAccess("finished", player)).toBe("full");
    expect(championshipAccess("finished", outsider)).toBe("hidden");
    expect(championshipAccess("finished", admin)).toBe("readonly");
  });

  it("drafts are for admins only", () => {
    expect(championshipAccess("draft", outsider)).toBe("hidden");
    expect(championshipAccess("draft", player)).toBe("hidden");
    expect(championshipAccess("draft", admin)).toBe("readonly");
  });
});

describe("homeChampionship", () => {
  const t = (slug: string, status: "registration" | "running" | "finished", created_at: string) => ({ slug, status, created_at });

  it("prefers the newest running one", () => {
    const mine = [t("old", "running", "2026-10-01"), t("new", "running", "2026-11-01"), t("next", "registration", "2026-11-05")];
    expect(homeChampionship(mine)?.slug).toBe("new");
  });

  it("falls back to an upcoming one, never a finished one", () => {
    expect(homeChampionship([t("done", "finished", "2026-11-01"), t("next", "registration", "2026-11-05")])?.slug).toBe("next");
    expect(homeChampionship([t("done", "finished", "2026-11-01")])).toBeNull();
  });
});
