import { describe, expect, it, vi } from "vitest";
import type { MatchView, Player, Profile, Round } from "./types";

vi.mock("./supabase/server", () => ({ createAdminClient: vi.fn() }));
const { reminderLines } = await import("./notify");

const player = (name: string): Player => ({ id: name, tournament_id: "t", karnyx_name: name, heroes: [] });
const match = (a: string, b: string): MatchView => ({ a: player(a), b: player(b) }) as MatchView;
const round = { number: 2, deadline: "2026-11-02T10:03:00Z" } as Round;

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
