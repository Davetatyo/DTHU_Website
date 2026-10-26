import { describe, expect, it } from "vitest";
import { parseKarnyxPaste } from "./karnyx";

// Round 1 as copied from Karnyx by davetatyo (note the blank line after his own match).
const ROUND_1 = `Santa Avatar
Krampus Avatar
Headless Horseman Avatar
EngineerGnome
Spider-Man Avatar
Black Widow Avatar
Shadow Thief Avatar
Malmos Andris
Black Widow Avatar
Raveness Avatar
Gambit Avatar
Lovinho
Monk Avatar
Psylocke Avatar
Pyromancer Avatar
Sandor
Pyromancer Avatar
Druid Avatar
Forgemaster Avatar
J0cz0ka
Ninja Avatar
Raveness Avatar
Forgemaster Avatar
Burlogh
Loki Avatar
Black Widow Avatar
Raveness Avatar
Tomi
Ninja Avatar
Raveness Avatar
Sun Elf Avatar
Fábián Gábor
Alchemist Avatar
Vampire Lord Avatar
Spider-Man Avatar
Dave
Gambit Avatar
Mystic Brawler Avatar
Cursed Pirate Avatar
ZenBulldozer

Raveness Avatar
Black Widow Avatar
Druid Avatar
Subi
Black Panther Avatar
Ninja Avatar
Cursed Pirate Avatar
Bence
Monk Avatar
Shadow Thief Avatar
Druid Avatar
Alice
Druid Avatar
Vampire Lord Avatar
Headless Horseman Avatar
T. Laci
Necromancer Avatar
Shadow Thief Avatar
Spider-Man Avatar
MartinafánXD
Loki Avatar
Iceman Avatar
Storm Avatar
Varbaro
Pyromancer Avatar
Pale Lady Avatar
Druid Avatar
NoOne92
Cursed Pirate Avatar
Iceman Avatar
Pyromancer Avatar
Benci
Druid Avatar
Doctor Strange Avatar
Necromancer Avatar
haga
Pyromancer Avatar
Shadow Thief Avatar
Headless Horseman Avatar
Ashimar
Pyromancer Avatar
Pale Lady Avatar
Headless Horseman Avatar
Mawil
Shadow Thief Avatar
Pale Lady Avatar
Sun Elf Avatar
moi`;

describe("parseKarnyxPaste", () => {
  it("pairs the real round 1 paste into 11 matches", () => {
    const { players, pairings, warnings } = parseKarnyxPaste(ROUND_1);
    expect(warnings).toEqual([]);
    expect(players).toHaveLength(22);
    expect(pairings.map((p) => [p.a.name, p.b?.name])).toEqual([
      ["EngineerGnome", "Malmos Andris"],
      ["Lovinho", "Sandor"],
      ["J0cz0ka", "Burlogh"],
      ["Tomi", "Fábián Gábor"],
      ["Dave", "ZenBulldozer"],
      ["Subi", "Bence"],
      ["Alice", "T. Laci"],
      ["MartinafánXD", "Varbaro"],
      ["NoOne92", "Benci"],
      ["haga", "Ashimar"],
      ["Mawil", "moi"],
    ]);
    expect(pairings[4].a.heroes).toEqual(["Alchemist", "Vampire Lord", "Spider-Man"]);
    expect(pairings[10].tableNo).toBe(11);
  });

  it("ignores button text that has no heroes before it", () => {
    const text = "A Avatar\nB Avatar\nC Avatar\nAnna\nEredmény rögzítése\nD Avatar\nE Avatar\nF Avatar\nBéla";
    const { pairings, warnings } = parseKarnyxPaste(text);
    expect(pairings).toHaveLength(1);
    expect(pairings[0].b?.name).toBe("Béla");
    expect(warnings[0]).toContain("Eredmény rögzítése");
  });

  it("gives the last player a bye when the count is odd", () => {
    const text = "A Avatar\nB Avatar\nC Avatar\nAnna\nD Avatar\nE Avatar\nF Avatar\nBéla\nG Avatar\nH Avatar\nI Avatar\nCili";
    const { pairings, warnings } = parseKarnyxPaste(text);
    expect(pairings).toHaveLength(2);
    expect(pairings[1]).toMatchObject({ a: { name: "Cili" }, b: null });
    expect(warnings.some((w) => w.includes("Bye"))).toBe(true);
  });

  it("warns about wrong hero counts and duplicates", () => {
    const text = "A Avatar\nAnna\nB Avatar\nC Avatar\nD Avatar\nanna\nX Avatar";
    const { warnings } = parseKarnyxPaste(text);
    expect(warnings).toContain("Anna: 1 hős szerepel 3 helyett");
    expect(warnings).toContain("anna többször szerepel");
    expect(warnings).toContain("A szöveg végén 1 hős áll játékosnév nélkül");
  });

  it("handles Windows line endings", () => {
    const { players } = parseKarnyxPaste("A Avatar\r\nB Avatar\r\nC Avatar\r\nAnna\r\n");
    expect(players).toEqual([{ name: "Anna", heroes: ["A", "B", "C"] }]);
  });
});
