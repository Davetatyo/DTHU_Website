import { describe, expect, it } from "vitest";
import { checkResult, parseHp } from "./game-result";

describe("parseHp", () => {
  it("accepts whole numbers 0-99 with spaces around", () => {
    expect(parseHp("0")).toBe(0);
    expect(parseHp(" 42 ")).toBe(42);
    expect(parseHp("99")).toBe(99);
  });

  it("rejects everything else", () => {
    for (const raw of ["", "-1", "100", "4.5", "abc", "1e1"]) expect(parseHp(raw)).toBeNull();
  });
});

describe("checkResult", () => {
  it("returns the parsed result", () => {
    expect(checkResult("a", "12", "0")).toEqual({ ok: true, outcome: "a", hp_a: 12, hp_b: 0 });
  });

  it("needs a known outcome", () => {
    expect(checkResult("", "1", "0").ok).toBe(false);
    expect(checkResult("x", "1", "0").ok).toBe(false);
  });

  it("a winner can't finish on 0 health, a draw can, the loser may keep health", () => {
    expect(checkResult("a", "0", "0").ok).toBe(false);
    expect(checkResult("b", "5", "0").ok).toBe(false);
    expect(checkResult("draw", "0", "0").ok).toBe(true);
    expect(checkResult("b", "20", "3").ok).toBe(true);
  });
});
