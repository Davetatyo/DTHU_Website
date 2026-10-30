import { describe, expect, it } from "vitest";
import { parseKarnyxPaste } from "@/features/match-organizer/lib/karnyx";
import { bookmarkletHref, toPasteText } from "./bookmarklet";

const players = [
  { name: "EngineerGnome", heroes: ["Santa Avatar", "Krampus Avatar", "Headless Horseman Avatar"] },
  { name: "Malmos Andris", heroes: ["Spider-Man Avatar", "Black Widow Avatar", "Shadow Thief Avatar"] },
  { name: "Lovinho", heroes: ["Black Widow Avatar", "Raveness Avatar", "Gambit Avatar"] },
];

describe("toPasteText", () => {
  it("produces text the Admin felület import reads back exactly", () => {
    const parsed = parseKarnyxPaste(toPasteText(players));
    expect(parsed.players.map((p) => p.name)).toEqual(["EngineerGnome", "Malmos Andris", "Lovinho"]);
    expect(parsed.players[0].heroes).toEqual(["Santa", "Krampus", "Headless Horseman"]);
    expect(parsed.pairings[0].b?.name).toBe("Malmos Andris");
    expect(parsed.pairings[1].b).toBeNull();
    expect(parsed.warnings).toEqual(["Páratlan létszám: Lovinho kap Bye-t"]);
  });
});

describe("bookmarkletHref", () => {
  it("is a self-contained javascript: URL", () => {
    const href = bookmarkletHref();
    expect(href.startsWith("javascript:")).toBe(true);
    const code = decodeURIComponent(href.slice("javascript:".length));
    expect(() => new Function(code)).not.toThrow();
    expect(code).toContain("/players/");
  });
});
