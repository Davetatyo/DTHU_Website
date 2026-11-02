import { describe, expect, it } from "vitest";
import { applyRelevance, defaultFlags, isRelevant, missingTargets, plainText, resolveLinks, splitEntry } from "./render";

describe("splitEntry", () => {
  it("splits off the title and the see-also links", () => {
    const parts = splitEntry('<h2 slot="header">Burn <small>x</small></h2>\n<ul slot="header" class="see-also"><li><a href="#tokens">Tokenek</a></li></ul>\n<p>Body</p>');
    expect(parts).toEqual({ titleHtml: "Burn <small>x</small>", seeAlsoHtml: '<li><a href="#tokens">Tokenek</a></li>', bodyHtml: "<p>Body</p>" });
  });

  it("works without see-also", () => {
    expect(splitEntry('<h2 slot="header">A</h2><p>B</p>').seeAlsoHtml).toBeNull();
  });
});

describe("resolveLinks", () => {
  const resolve = (t: string) => (t === "setup" ? "/szabalytar/elokeszites" : null);

  it("turns #id links into our URLs and keeps their attributes", () => {
    expect(resolveLinks('<a class="x" href="#setup">Előkészítés</a>', resolve)).toBe('<a class="x" href="/szabalytar/elokeszites">Előkészítés</a>');
  });

  it("keeps the text of links whose page doesn't exist yet", () => {
    const html = resolveLinks('Lásd <a href="#ability"><i>képesség</i></a>.', resolve);
    expect(html).toBe('Lásd <span class="rp-missing" data-target="ability"><i>képesség</i></span>.');
    expect(missingTargets(html)).toEqual(["ability"]);
  });

  it("leaves external links alone", () => {
    const a = '<a href="https://dicethrone.com">x</a>';
    expect(resolveLinks(a, resolve)).toBe(a);
  });
});

describe("dynamic rules (data-relevance)", () => {
  const flags = new Set(["g-vs", "h-all", "m-2v2"]);

  it("evaluates flags with ||, && and !", () => {
    expect(isRelevant("m-2v2 || m-koh", flags)).toBe(true);
    expect(isRelevant("m-koh", flags)).toBe(false);
    expect(isRelevant("h-all && !m-koh", flags)).toBe(true);
    expect(isRelevant("(m-koh || m-2v2) && g-vs", flags)).toBe(true);
    expect(isRelevant("", flags)).toBe(true);
  });

  it("starts with the pre-checked choices and hides what doesn't apply", () => {
    const html = '<input name="m" type="radio" value="m-1v1" checked><input name="m" type="radio" value="m-2v2"><li data-relevance="m-2v2">2v2</li><li data-relevance="m-1v1">1v1</li>';
    const start = defaultFlags(html);
    expect([...start].sort()).toEqual(["g-vs", "h-all", "m-1v1"]);
    expect(applyRelevance(html, start)).toContain('<li data-relevance="m-2v2" hidden>2v2</li><li data-relevance="m-1v1">1v1</li>');
  });
});

it("plainText drops tags and icons", () => {
  expect(plainText('Tokenek <small>és <svg><use href="#x"/></svg>lapok</small> &amp; más')).toBe("Tokenek és lapok & más");
});
