import { describe, expect, it } from "vitest";
import { chunkLines, mention, mentionedIds } from "./discord";
import type { Player, Profile } from "./types";

const player = (name: string): Player => ({ id: name, tournament_id: "t", karnyx_name: name, heroes: [] });

describe("mention", () => {
  const profiles = new Map([["dave", { discord_id: "123" } as Profile]]);

  it("mentions linked players by Discord ID", () => {
    expect(mention(player("Dave"), profiles)).toBe("<@123>");
  });

  it("falls back to the bold Karnyx name", () => {
    expect(mention(player("Subi"), profiles)).toBe("**Subi**");
  });
});

describe("chunkLines", () => {
  it("keeps every message under the limit without splitting lines", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `${i}. sor ${"x".repeat(30)}`);
    const chunks = chunkLines(lines, 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks.join("\n")).toBe(lines.join("\n"));
  });
});

describe("mentionedIds", () => {
  it("extracts user IDs", () => {
    expect(mentionedIds("<@1> vs <@22> **x**")).toEqual(["1", "22"]);
  });
});
