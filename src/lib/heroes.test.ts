import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { heroPortrait, heroSlug } from "./heroes";

describe("hero portraits", () => {
  it("makes slugs from Karnyx names", () => {
    expect(heroSlug("Moon Elf")).toBe("moon-elf");
    expect(heroSlug("Spider-Man")).toBe("spider-man");
    expect(heroSlug(" Doctor Strange ")).toBe("doctor-strange");
  });

  it("finds portraits that exist on disk, none for unknown heroes", () => {
    for (const hero of ["Barbarian", "Shadow Thief", "Pale Lady", "Sun Elf", "Necromancer", "Spider-Man"]) {
      const url = heroPortrait(hero);
      expect(url, hero).toBeDefined();
      expect(existsSync(join(process.cwd(), "public", url!)), hero).toBe(true);
    }
    expect(heroPortrait("Nobody")).toBeUndefined();
    expect(heroPortrait(null)).toBeUndefined();
  });
});
