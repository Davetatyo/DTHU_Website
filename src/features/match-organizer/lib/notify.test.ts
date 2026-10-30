import { describe, expect, it, vi } from "vitest";
import type { MatchView, Player, Profile, Round } from "./types";

vi.mock("./supabase/server", () => ({ createAdminClient: vi.fn() }));
const { confirmedLines, proposalLine, reminderLines, roundOpenedLines, swapLines } = await import("./notify");

const player = (name: string): Player => ({ id: name, tournament_id: "t", karnyx_name: name, heroes: [] });
const match = (a: string, b: string): MatchView => ({ a: player(a), b: player(b) }) as MatchView;
const bye = (a: string): MatchView => ({ a: player(a), b: null }) as MatchView;
const round = { number: 2, deadline: "2026-11-02T10:03:00Z" } as Round;

describe("swapLines", () => {
  it("pings the new pairing and names who left, with a Pihen line when they rest", () => {
    const m = { ...match("Dave", "Moi"), id: "m1", round } as MatchView;
    const profiles = new Map([["moi", { discord_id: "333" } as Profile]]);
    const lines = swapLines(m, player("ZenBulldozer"), player("Moi"), player("Dave"), true, profiles, "https://dt.example");
    expect(lines[0]).toBe(
      "🔁 **Csere a 2. fordulóban:** **ZenBulldozer** helyett <@333> játszik **Dave** ellen. Egyeztessetek időpontot: https://dt.example/meccsszervezo/meccs/m1",
    );
    expect(lines[1]).toBe("Pihen: **ZenBulldozer**");
  });
});

describe("proposalLine", () => {
  it("is one short line with the ping and the link", () => {
    const m = { ...match("Dave", "Subi"), id: "m1", round } as MatchView;
    const profiles = new Map([["subi", { discord_id: "222" } as Profile]]);
    expect(proposalLine(m, [player("Subi")], "Dave", profiles, "https://dt.example")).toBe(
      "📅 <@222>, **Dave** időpontot javasolt: https://dt.example/meccsszervezo/meccs/m1",
    );
  });
});

describe("confirmedLines", () => {
  it("names the players in bold without pinging them", () => {
    const m = { ...match("Dave", "Subi"), id: "m1", round } as MatchView;
    const text = confirmedLines(m, new Date("2026-10-28T19:00:00Z"), "x").join("\n");
    expect(text).toContain("**Dave** vs **Subi**");
    expect(text).not.toContain("<@");
  });
});

describe("roundOpenedLines", () => {
  const profiles = new Map([["moi", { discord_id: "333" } as Profile]]);

  it("lists the pairs, then the Bye players on a Pihen line", () => {
    const lines = roundOpenedLines(round, [match("Dave", "Subi"), match("Alice", "Bence"), bye("moi")], profiles, "x");
    expect(lines).toContain("1. **Dave** vs **Subi**");
    expect(lines).toContain("2. **Alice** vs **Bence**");
    expect(lines.at(-1)).toBe("Pihen: <@333>");
    expect(lines.join("\n")).not.toContain("Bye");
  });

  it("has no Pihen line when nobody rests", () => {
    expect(roundOpenedLines(round, [match("A", "B")], new Map(), "x").join("\n")).not.toContain("Pihen");
  });
});

describe("reminderLines", () => {
  const profiles = new Map([
    ["dave", { discord_id: "111" } as Profile],
    ["subi", { discord_id: "222" } as Profile],
  ]);

  it("pings both players without a suggestion and only the responder of an open one", () => {
    const lines = reminderLines(
      round,
      {
        unscheduled: [match("Dave", "ZenBulldozer")],
        awaitingAnswer: [{ match: match("Subi", "Bence"), responders: [player("Subi")], proposer: "Bence" }],
      },
      profiles,
      "https://dt.example",
    );
    const text = lines.join("\n");
    expect(text).toContain("Emlékeztető: 2. forduló");
    expect(text).toContain("• <@111> vs **ZenBulldozer**");
    expect(text).toContain("• <@222> (Bence javasolt)");
    expect(text).toContain("https://dt.example");
  });

  it("leaves out empty sections", () => {
    const text = reminderLines(round, { unscheduled: [match("A", "B")], awaitingAnswer: [] }, new Map(), "x").join("\n");
    expect(text).not.toContain("Javaslat vár");
  });
});
