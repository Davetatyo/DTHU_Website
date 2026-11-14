import { describe, expect, it } from "vitest";
import { profileFor, profileIdKey, profileNameKey } from "./player-profile";
import type { Profile } from "./types";

const feri = { id: "p-feri", karnyx_name: "FeriRenamed", discord_id: "1" } as Profile;
const other = { id: "p-other", karnyx_name: "FeriDT", discord_id: "2" } as Profile;
const map = new Map<string, Profile>([
  [profileIdKey(feri.id), feri],
  [profileNameKey(feri.karnyx_name!), feri],
  [profileIdKey(other.id), other],
  [profileNameKey(other.karnyx_name!), other],
]);

describe("profileFor", () => {
  it("a linked player is found by account even after a rename, never by an old name", () => {
    expect(profileFor(map, { karnyx_name: "FeriDT", profile_id: "p-feri" })).toBe(feri);
  });

  it("an unlinked (Karnyx-league) player is found by name, case-insensitively", () => {
    expect(profileFor(map, { karnyx_name: "feridt", profile_id: null })).toBe(other);
    expect(profileFor(map, { karnyx_name: "Nobody" })).toBeNull();
  });

  it("a linked player whose account isn't loaded is unknown", () => {
    expect(profileFor(map, { karnyx_name: "FeriDT", profile_id: "p-missing" })).toBeNull();
    expect(profileFor(map, null)).toBeNull();
  });
});
