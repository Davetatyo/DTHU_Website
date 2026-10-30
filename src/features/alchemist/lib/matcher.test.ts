import { describe, expect, it } from "vitest";
import { anorm, astem, atoks, entities, lev, match } from "./matcher";

describe("text normalising", () => {
  it("drops accents and punctuation", () => {
    expect(anorm("Mennyi a KÉZLIMIT?").trim()).toBe("mennyi a kezlimit");
  });
  it("stems Hungarian suffixes", () => {
    expect(astem("kartyakkal")).toBe(astem("kartya"));
  });
  it("drops stop words and unifies synonyms", () => {
    expect(atoks("Mi az az ulti?")).toEqual(atoks("ultimate"));
  });
  it("measures small edit distances", () => {
    expect(lev("ultimat", "ultimate")).toBe(1);
    expect(lev("a", "abcdef")).toBe(9);
  });
});

describe("match", () => {
  const top = (q: string) => match(q).res[0]?.it.id;
  it("finds the hand limit rule", () => {
    expect(top("Mennyi lap lehet a kezemben?")).toBe("r-eldobas");
  });
  it("finds an Ultimate answer, even with a typo", () => {
    expect(match("Hogyan állíthatom meg az ultimatet?").res[0].it.title).toMatch(/ultimate/i);
  });
  it("answers site questions", () => {
    expect(top("Hogyan szerzek jegyet?")).toBe("s-jegy");
  });
  it("recognises heroes", () => {
    expect(entities("Hogy működik a Barbár?").some((e) => e.kind === "hero")).toBe(true);
  });
});
