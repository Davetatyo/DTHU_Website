import { describe, expect, it } from "vitest";
import { isProfileComplete, NOT_PLAYING, resolveKarnyxChoice } from "./profile";

const roster = ["Dave", "ZenBulldozer", "Subi"];

describe("resolveKarnyxChoice", () => {
  it("saves no Karnyx name for organisers and spectators", () => {
    expect(resolveKarnyxChoice(NOT_PLAYING, roster)).toEqual({ ok: true, name: null });
  });

  it("uses the roster's spelling for a player", () => {
    expect(resolveKarnyxChoice("zenbulldozer", roster)).toEqual({ ok: true, name: "ZenBulldozer" });
  });

  it("rejects names that are not on the roster", () => {
    expect(resolveKarnyxChoice("Valaki", roster)).toMatchObject({ ok: false });
  });

  it("requires a choice when a roster exists", () => {
    expect(resolveKarnyxChoice("", roster)).toMatchObject({ ok: false });
  });

  it("allows an empty or typed name before any roster exists", () => {
    expect(resolveKarnyxChoice("", [])).toEqual({ ok: true, name: null });
    expect(resolveKarnyxChoice(" Dave ", [])).toEqual({ ok: true, name: "Dave" });
  });
});

describe("isProfileComplete", () => {
  it("is complete once the Facebook name is saved, with or without a Karnyx name", () => {
    expect(isProfileComplete({ facebook_name: "Nagy Dávid" })).toBe(true);
    expect(isProfileComplete({ facebook_name: null })).toBe(false);
  });
});
