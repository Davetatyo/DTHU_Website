import { describe, expect, it } from "vitest";
import { RULES } from "../data/rules";
import { ruleIndex, searchRules } from "./search";

describe("searchRules", () => {
  it("ignores accents and finds rules by title", () => {
    const hits = searchRules("kezlimit");
    expect(hits.length).toBeGreaterThan(0);
  });
  it("needs at least two characters", () => {
    expect(searchRules("a")).toEqual([]);
  });
  it("finds heroes", () => {
    expect(searchRules("barbár").some((h) => h.k === "Hős")).toBe(true);
  });
});

describe("rule content", () => {
  it("links only to rules that exist", () => {
    const ids = new Set(RULES.map((r) => r.id));
    const special = ["lista-hosok", "lista-jelzok", "gyik-szabaly", "targymutato"];
    for (const r of RULES) {
      for (const [, id] of r.b.matchAll(/href="\/szabalytar\/([^"]+)"/g)) {
        expect(ids.has(id) || special.includes(id), `${r.id} → ${id}`).toBe(true);
      }
    }
  });
  it("indexes every rule", () => {
    const links = ruleIndex().flatMap(([, items]) => items.map(([, h]) => h));
    for (const r of RULES) expect(links).toContain(`/szabalytar/${r.id}`);
  });
});
