import { describe, expect, it } from "vitest";
import { nextSortOrder, parseLinkForm, reorder } from "./links";

describe("parseLinkForm", () => {
  it("reads the fields", () => {
    expect(parseLinkForm({ title: " Discord ", url: "https://discord.gg/x", description: " ", visible: "on" })).toEqual({
      ok: true,
      fields: { title: "Discord", url: "https://discord.gg/x", description: null, visible: true },
    });
  });

  it("needs a title and an http(s) address", () => {
    expect(parseLinkForm({ title: "", url: "https://x.hu" }).ok).toBe(false);
    expect(parseLinkForm({ title: "x", url: "javascript:alert(1)" }).ok).toBe(false);
    expect(parseLinkForm({ title: "x", url: "dthu.hu" }).ok).toBe(false);
  });
});

describe("reorder", () => {
  const links = [
    { id: "a", sort_order: 10 },
    { id: "b", sort_order: 20 },
    { id: "c", sort_order: 30 },
  ];

  it("swaps a link with its neighbour", () => {
    expect(reorder(links, "b", -1)).toEqual([
      { id: "b", sort_order: 10 },
      { id: "a", sort_order: 20 },
    ]);
    expect(reorder(links, "b", 1)).toEqual([
      { id: "c", sort_order: 20 },
      { id: "b", sort_order: 30 },
    ]);
  });

  it("does nothing at the ends and renumbers messy orders", () => {
    expect(reorder(links, "a", -1)).toEqual([]);
    expect(reorder(links, "c", 1)).toEqual([]);
    expect(reorder([{ id: "a", sort_order: 5 }, { id: "b", sort_order: 5 }], "b", -1).length).toBeGreaterThan(0);
  });

  it("puts new links last", () => {
    expect(nextSortOrder(links)).toBe(40);
    expect(nextSortOrder([])).toBe(10);
  });
});
