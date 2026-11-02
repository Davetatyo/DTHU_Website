import { describe, expect, it } from "vitest";
import { parseNewsBlocks, parseNewsForm, showEdited } from "./news";

const ADMIN = "11111111-2222-3333-4444-555555555555";
const ID = "99999999-8888-7777-6666-555555555555";

describe("parseNewsForm", () => {
  it("reads the fields", () => {
    const r = parseNewsForm({ title: " Elindult a 2. forduló ", category: "tournament", lead: " Rövid. ", pinned: "on", author_id: ADMIN }, new Set([ADMIN]));
    expect(r).toEqual({ ok: true, fields: { title: "Elindult a 2. forduló", category: "tournament", lead: "Rövid.", pinned: true, author_id: ADMIN } });
  });

  it("rejects a missing title, a wrong category and a non-admin author", () => {
    expect(parseNewsForm({ title: "", category: "tournament" }, new Set()).ok).toBe(false);
    expect(parseNewsForm({ title: "x", category: "gossip" }, new Set()).ok).toBe(false);
    expect(parseNewsForm({ title: "x", category: "site", author_id: ADMIN }, new Set()).ok).toBe(false);
  });
});

describe("parseNewsBlocks", () => {
  it("allows every block type for news", () => {
    const r = parseNewsBlocks(
      [
        { t: "list", ordered: true, items: ["egy", " ", "kettő"] },
        { t: "quote", text: "GG", by: "Dave" },
        { t: "box", tone: "warn", text: "Határidő: hétfő" },
        { t: "gallery", paths: [`${ID}/a.webp`, `${ID}/b.webp`] },
        { t: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        { t: "event", id: ADMIN },
        { t: "hr" },
      ],
      ID,
    );
    expect(r.ok && r.blocks.map((b) => b.t)).toEqual(["list", "quote", "box", "gallery", "video", "event", "hr"]);
    expect(r.ok && r.blocks[0]).toEqual({ t: "list", ordered: true, items: ["egy", "kettő"] });
  });
});

describe("showEdited", () => {
  it("shows Frissítve only for saves well after publishing", () => {
    expect(showEdited("2026-11-03T10:00:00Z", "2026-11-03T10:05:00Z")).toBe(false);
    expect(showEdited("2026-11-03T10:00:00Z", "2026-11-03T12:00:00Z")).toBe(true);
    expect(showEdited(null, "2026-11-03T12:00:00Z")).toBe(false);
  });
});
