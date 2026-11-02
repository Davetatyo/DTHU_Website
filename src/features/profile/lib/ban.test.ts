import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { banBlockReason, isBanned } from "./ban";

const admin = { id: "a", is_admin: true };
const player = { id: "p", is_admin: false, discord_username: "player", banned_at: null };

describe("banBlockReason", () => {
  beforeEach(() => vi.stubEnv("BOOTSTRAP_ADMIN_DISCORD", "davetatyo"));
  afterEach(() => vi.unstubAllEnvs());

  it("lets an admin ban a normal player", () => {
    expect(banBlockReason(admin, player)).toBeNull();
  });

  it("blocks non-admins, self-bans, admins, the owner and repeat bans", () => {
    expect(banBlockReason({ id: "x", is_admin: false }, player)).not.toBeNull();
    expect(banBlockReason(admin, { ...player, id: "a" })).not.toBeNull();
    expect(banBlockReason(admin, { ...player, is_admin: true })).not.toBeNull();
    expect(banBlockReason(admin, { ...player, discord_username: "davetatyo" })).not.toBeNull();
    expect(banBlockReason(admin, { ...player, banned_at: "2026-11-02T10:00:00Z" })).not.toBeNull();
  });
});

describe("isBanned", () => {
  it("is true only when banned_at is set", () => {
    expect(isBanned({ banned_at: "2026-11-02T10:00:00Z" })).toBe(true);
    expect(isBanned({ banned_at: null })).toBe(false);
    expect(isBanned(null)).toBe(false);
  });
});
