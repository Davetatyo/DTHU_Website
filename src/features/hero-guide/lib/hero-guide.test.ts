import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { knownIds } from "@/features/rulebook/lib/content";
import { canOpenHeroGuide, heroIdFromName, opponentFirst } from "./hero-guide";

describe("canOpenHeroGuide", () => {
  const admin = { hasOpponent: true, isLoggedIn: true, isAdmin: true };
  const user = { hasOpponent: true, isLoggedIn: true, isAdmin: false };
  const visitor = { hasOpponent: true, isLoggedIn: false, isAdmin: false };

  it("is for everyone logged in once opened, whether they play in the match or not", () => {
    expect(canOpenHeroGuide(user, false)).toBe(true);
    expect(canOpenHeroGuide(admin, false)).toBe(true);
  });

  it("is not for logged-out visitors", () => {
    expect(canOpenHeroGuide(visitor, false)).toBe(false);
    expect(canOpenHeroGuide(visitor, true)).toBe(false);
  });

  it("is admins only during the test phase", () => {
    expect(canOpenHeroGuide(admin, true)).toBe(true);
    expect(canOpenHeroGuide(user, true)).toBe(false);
  });

  it("doesn't exist for a Bye, which has no opponent", () => {
    expect(canOpenHeroGuide({ ...admin, hasOpponent: false }, true)).toBe(false);
    expect(canOpenHeroGuide({ ...user, hasOpponent: false }, false)).toBe(false);
  });
});

describe("heroIdFromName", () => {
  it("turns roster names into Szabálytár ids", () => {
    expect(heroIdFromName("Pyromancer")).toBe("pyromancer");
    expect(heroIdFromName("Pale Lady")).toBe("pale-lady");
    expect(heroIdFromName("Spider-Man")).toBe("spider-man");
    expect(heroIdFromName(" Headless Horseman ")).toBe("headless-horseman");
  });

  it("finds the names used in tournaments", () => {
    const names = ["Alchemist", "Black Widow", "Cursed Pirate", "Doctor Strange", "Jean Grey", "Moon Elf", "Mystic Brawler", "Vampire Lord"];
    for (const name of names) expect(knownIds().heroes.has(heroIdFromName(name)), name).toBe(true);
  });
});

describe("hero portraits", () => {
  it("exist for every hero, because the selector shows them", () => {
    for (const id of knownIds().heroes) {
      expect(existsSync(join(process.cwd(), "public/szabalytar/img/heroes", `${id}.webp`)), id).toBe(true);
    }
  });
});

describe("opponentFirst", () => {
  const me = { name: "én", isMe: true };
  const other = { name: "ő", isMe: false };

  it("puts the opponent first, whichever side you are on", () => {
    expect(opponentFirst([me, other])).toEqual([other, me]);
    expect(opponentFirst([other, me])).toEqual([other, me]);
  });

  it("keeps the match's order for an admin who isn't playing", () => {
    const a = { name: "a", isMe: false };
    const b = { name: "b", isMe: false };
    expect(opponentFirst([a, b])).toEqual([a, b]);
  });
});
