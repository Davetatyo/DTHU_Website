import { describe, expect, it } from "vitest";
import { movement, sampleRanking } from "./ranking";

describe("sampleRanking", () => {
  const rows = sampleRanking([
    { karnyx_name: "Dave", heroes: ["Alchemist"] },
    { karnyx_name: "Tomi", heroes: ["Loki"] },
    { karnyx_name: "Subi", heroes: [] },
  ]);

  it("is stable for the same names and keeps real heroes", () => {
    expect(sampleRanking([{ karnyx_name: "Dave", heroes: ["Alchemist"] }])[0]).toEqual(rows.find((r) => r.p === "Dave"));
    expect(rows.find((r) => r.p === "Dave")?.hero).toBe("Alchemist");
  });

  it("sorts by points, then wins", () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].pts > rows[i].pts || (rows[i - 1].pts === rows[i].pts && rows[i - 1].w >= rows[i].w)).toBe(true);
    }
  });

  it("keeps wins and losses consistent", () => {
    for (const r of rows) expect(r.w + r.l).toBe(r.m);
  });
});

describe("movement", () => {
  it("returns a class and a label", () => {
    expect(["up", "dn", "eq"]).toContain(movement("Dave")[0]);
  });
});
