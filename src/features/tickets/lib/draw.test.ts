import { describe, expect, it } from "vitest";
import { drawPhase, drawWinners, firstPickChance, maxEntry, parseTicketAmount, totalTickets } from "./draw";

/** Random source that returns the given values in order. */
const seq = (...values: number[]) => {
  let i = 0;
  return (max: number) => {
    const v = values[i++];
    if (v === undefined || v < 0 || v >= max) throw new Error(`bad test value ${v} for max ${max}`);
    return v;
  };
};

describe("drawWinners", () => {
  const entries = [
    { profileId: "a", tickets: 1 }, // ticket 0
    { profileId: "b", tickets: 3 }, // tickets 1-3
    { profileId: "c", tickets: 2 }, // tickets 4-5
  ];

  it("maps the drawn ticket to its owner", () => {
    expect(drawWinners(entries, 1, seq(0))).toEqual(["a"]);
    expect(drawWinners(entries, 1, seq(1))).toEqual(["b"]);
    expect(drawWinners(entries, 1, seq(3))).toEqual(["b"]);
    expect(drawWinners(entries, 1, seq(4))).toEqual(["c"]);
    expect(drawWinners(entries, 1, seq(5))).toEqual(["c"]);
  });

  it("removes a winner's tickets before the next pick", () => {
    // b wins (ticket 2 of 6), then the pot is a(0) c(1-2): ticket 1 → c, then only a is left.
    expect(drawWinners(entries, 3, seq(2, 1, 0))).toEqual(["b", "c", "a"]);
  });

  it("never draws more winners than entrants", () => {
    expect(drawWinners(entries, 10, seq(0, 0, 0))).toEqual(["a", "b", "c"]);
    expect(drawWinners([], 2, seq())).toEqual([]);
  });

  it("ignores empty entries", () => {
    expect(drawWinners([{ profileId: "x", tickets: 0 }, { profileId: "y", tickets: 2 }], 2, seq(1))).toEqual(["y"]);
  });

  it("is weighted by tickets", () => {
    const wins = { a: 0, b: 0, c: 0 } as Record<string, number>;
    // Walk every possible first ticket once: a owns 1/6, b 3/6, c 2/6.
    for (let t = 0; t < totalTickets(entries); t++) wins[drawWinners(entries, 1, () => t)[0]]++;
    expect(wins).toEqual({ a: 1, b: 3, c: 2 });
  });
});

describe("helpers", () => {
  it("firstPickChance", () => {
    expect(firstPickChance(3, 6)).toBe(0.5);
    expect(firstPickChance(0, 0)).toBe(0);
  });

  it("drawPhase", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    expect(drawPhase({ status: "open", closes_at: "2026-11-03T00:00:00Z" }, now)).toBe("open");
    expect(drawPhase({ status: "open", closes_at: "2026-11-02T12:00:00Z" }, now)).toBe("closing");
    expect(drawPhase({ status: "drawn", closes_at: "2026-11-01T00:00:00Z" }, now)).toBe("drawn");
    expect(drawPhase({ status: "cancelled", closes_at: "2026-11-03T00:00:00Z" }, now)).toBe("cancelled");
  });

  it("maxEntry respects balance and cap", () => {
    expect(maxEntry(10, 0, null)).toBe(10);
    expect(maxEntry(10, 3, 5)).toBe(2);
    expect(maxEntry(1, 0, 5)).toBe(1);
    expect(maxEntry(10, 6, 5)).toBe(0);
    expect(maxEntry(0, 0, null)).toBe(0);
  });

  it("parseTicketAmount", () => {
    expect(parseTicketAmount("3")).toBe(3);
    expect(parseTicketAmount(" 12 ")).toBe(12);
    expect(parseTicketAmount("0")).toBeNull();
    expect(parseTicketAmount("-2")).toBeNull();
    expect(parseTicketAmount("-2", true)).toBe(-2);
    expect(parseTicketAmount("1.5")).toBeNull();
    expect(parseTicketAmount("abc")).toBeNull();
    expect(parseTicketAmount("99999")).toBeNull();
  });
});
