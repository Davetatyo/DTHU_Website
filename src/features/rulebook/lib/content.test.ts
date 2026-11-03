import { describe, expect, it } from "vitest";
import { allEntries, knownIds, renderEntry } from "./content";
import { entryPath, HOME_GROUPS, LEGACY_SLUGS, refForPath, RULE_PAGES } from "./pages";
import { missingTargets } from "./render";

// Checks every imported content file (content/), so a broken edit fails the tests.
describe("Szabálytár content", () => {
  const entries = allEntries();

  it("has the rules, heroes and tokens", () => {
    expect(knownIds().heroes.size).toBeGreaterThanOrEqual(45);
    expect(knownIds().tokens.size).toBeGreaterThanOrEqual(136);
    expect(entries.length).toBe(Object.keys(RULE_PAGES).length + knownIds().heroes.size + knownIds().tokens.size);
  });

  it("renders every entry with a title and no scripts", () => {
    for (const ref of entries) {
      const e = renderEntry(ref);
      expect(e.title, entryPath(ref)).not.toBe("");
      expect(e.bodyHtml, entryPath(ref)).not.toMatch(/<script|\son[a-z]+=|<a\b[^>]*href="#/i);
    }
  });

  it("finds every entry by its own path", () => {
    for (const ref of entries) expect(refForPath(entryPath(ref).split("/"), knownIds())).toEqual(ref);
  });

  it("only points the start page and old addresses at existing entries", () => {
    const slugs = new Set(Object.values(RULE_PAGES).map((p) => p.slug));
    for (const g of HOME_GROUPS) for (const [, id] of g.items) expect(RULE_PAGES[id], id).toBeDefined();
    for (const to of Object.values(LEGACY_SLUGS)) expect(slugs.has(to), to).toBe(true);
  });

  it("leaves out Adventures and Marvel co-op", () => {
    for (const ref of entries) expect(renderEntry(ref).bodyHtml).not.toMatch(/g-dta|g-dtm|faq-dta/);
  });

  it("lists the links still waiting for a page (to translate)", () => {
    const missing = new Set(entries.flatMap((ref) => [...missingTargets(renderEntry(ref).bodyHtml), ...missingTargets(renderEntry(ref).seeAlsoHtml ?? "")]));
    // Pages RulePop has but the Hungarian version doesn't yet (phase 5), plus our own pages to
    // come (settings, search). Shrinks as they are added; new entries here mean a broken link.
    expect([...missing].sort()).toMatchSnapshot();
  });
});
