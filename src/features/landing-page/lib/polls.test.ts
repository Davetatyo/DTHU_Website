import { describe, expect, it } from "vitest";
import { parsePollSetup } from "@/lib/content-blocks";
import { canSeeResults, checkVote, isClosed, OTHER, removedOptionsWithVotes, tally, type PollRow } from "./polls";

const now = new Date("2026-11-05T12:00:00Z");
const poll: PollRow = {
  id: "11111111-2222-3333-4444-555555555555",
  news_id: "99999999-8888-7777-6666-555555555555",
  question: "Melyik hőssel játszol a legszívesebben?",
  options: [
    { id: "a", label: "Barbarian" },
    { id: "b", label: "Paladin" },
    { id: "c", label: "Moon Elf" },
  ],
  multi: false,
  allow_other: true,
  closes_at: "2026-11-10T20:00:00Z",
};

describe("checkVote", () => {
  it("accepts one choice in a single-choice poll", () => {
    expect(checkVote(poll, ["b"], "", now)).toEqual({ ok: true, vote: { choices: ["b"], other_text: null } });
  });

  it("needs a typed answer for Egyéb", () => {
    expect(checkVote(poll, [OTHER], " ", now).ok).toBe(false);
    expect(checkVote(poll, [OTHER], " Krampus ", now)).toEqual({ ok: true, vote: { choices: [OTHER], other_text: "Krampus" } });
  });

  it("rejects empty, too many, unknown choices and closed polls", () => {
    expect(checkVote(poll, [], "", now).ok).toBe(false);
    expect(checkVote(poll, ["a", "b"], "", now).ok).toBe(false);
    expect(checkVote(poll, ["zz"], "", now).ok).toBe(false);
    expect(checkVote({ ...poll, allow_other: false }, [OTHER], "x", now).ok).toBe(false);
    expect(checkVote(poll, ["a"], "", new Date("2026-11-11T00:00:00Z")).ok).toBe(false);
  });

  it("allows several choices in a multi-choice poll", () => {
    expect(checkVote({ ...poll, multi: true }, ["a", "c", "a"], "", now)).toEqual({ ok: true, vote: { choices: ["a", "c"], other_text: null } });
  });
});

describe("tally", () => {
  it("counts voters, options and Egyéb answers", () => {
    const r = tally(poll, [
      { choices: ["a"], other_text: null },
      { choices: ["a"], other_text: null },
      { choices: ["b"], other_text: null },
      { choices: [OTHER], other_text: "Krampus" },
    ]);
    expect(r.voters).toBe(4);
    expect(r.options.map((o) => [o.id, o.count, o.pct])).toEqual([
      ["a", 2, 50],
      ["b", 1, 25],
      ["c", 0, 0],
    ]);
    expect(r.other).toEqual({ count: 1, pct: 25, answers: ["Krampus"] });
  });

  it("is empty without votes and leaves out Egyéb when not offered", () => {
    const r = tally({ ...poll, allow_other: false }, []);
    expect(r.voters).toBe(0);
    expect(r.options.every((o) => o.pct === 0)).toBe(true);
    expect(r.other).toBeNull();
  });
});

describe("visibility and closing", () => {
  it("shows results after voting, after closing, or to admins", () => {
    expect(canSeeResults({ voted: false, closed: false, isAdmin: false })).toBe(false);
    expect(canSeeResults({ voted: true, closed: false, isAdmin: false })).toBe(true);
    expect(canSeeResults({ voted: false, closed: true, isAdmin: false })).toBe(true);
    expect(canSeeResults({ voted: false, closed: false, isAdmin: true })).toBe(true);
    expect(isClosed(poll, now)).toBe(false);
  });

  it("refuses to drop options that already have votes", () => {
    const votes = [{ choices: ["b"], other_text: null }];
    expect(removedOptionsWithVotes(poll.options, [poll.options[0], poll.options[2]], votes)).toEqual([poll.options[1]]);
    expect(removedOptionsWithVotes(poll.options, [poll.options[0], poll.options[1]], votes)).toEqual([]);
  });
});

describe("parsePollSetup", () => {
  const setup = { id: poll.id, question: " Kérdés? ", options: [{ id: "a", label: "Egy" }, { id: "b", label: " " }, { id: "c", label: "Kettő" }], multi: true, other: false, closes_at: "2026-11-10T20:00:00Z" };

  it("keeps filled options and normalises the closing time", () => {
    const r = parsePollSetup(setup);
    expect(r.ok && r.poll).toEqual({ id: poll.id, question: "Kérdés?", options: [{ id: "a", label: "Egy" }, { id: "c", label: "Kettő" }], multi: true, other: false, closes_at: "2026-11-10T20:00:00.000Z" });
  });

  it("needs a question, two options and a closing time", () => {
    expect(parsePollSetup({ ...setup, question: "" }).ok).toBe(false);
    expect(parsePollSetup({ ...setup, options: [{ id: "a", label: "Egy" }] }).ok).toBe(false);
    expect(parsePollSetup({ ...setup, closes_at: "" }).ok).toBe(false);
    expect(parsePollSetup({ ...setup, options: [{ id: "a", label: "x" }, { id: "a", label: "y" }] }).ok).toBe(false);
  });
});
