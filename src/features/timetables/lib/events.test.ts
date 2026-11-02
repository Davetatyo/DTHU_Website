import { describe, expect, it } from "vitest";
import {
  eventEnd,
  formatEventDate,
  imagePathsInUse,
  parseBlocks,
  publishState,
  safeUrl,
  slugify,
  sortCalendar,
  uniqueSlug,
  type CalendarItem,
} from "./events";

const TZ = "Europe/Budapest";
const ID = "11111111-2222-3333-4444-555555555555";

describe("publishState", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  it("is a draft without a publish date, scheduled before it, live after it", () => {
    expect(publishState(null, now)).toBe("draft");
    expect(publishState("2026-11-04T08:00:00Z", now)).toBe("scheduled");
    expect(publishState("2026-11-03T11:59:00Z", now)).toBe("live");
  });
});

describe("eventEnd", () => {
  it("ends all-day events at the end of their last day (Budapest time)", () => {
    const start = "2026-11-20T23:00:00Z"; // 21 Nov 00:00 in Budapest
    expect(eventEnd({ starts_at: start, ends_at: null, all_day: true }, TZ).toISOString()).toBe("2026-11-21T22:59:00.000Z");
  });

  it("uses the end time, or the end of the start day when there is none", () => {
    expect(eventEnd({ starts_at: "2026-11-21T09:00:00Z", ends_at: "2026-11-21T17:00:00Z", all_day: false }, TZ).toISOString()).toBe(
      "2026-11-21T17:00:00.000Z",
    );
    expect(eventEnd({ starts_at: "2026-11-21T09:00:00Z", ends_at: null, all_day: false }, TZ).toISOString()).toBe(
      "2026-11-21T22:59:00.000Z",
    );
  });
});

describe("formatEventDate", () => {
  it("shows dates for all-day events and times for timed ones", () => {
    expect(formatEventDate("2026-11-20T23:00:00Z", null, true, TZ)).toMatch(/nov\. 21\./);
    expect(formatEventDate("2026-11-20T23:00:00Z", null, true, TZ)).not.toMatch(/\d{2}:\d{2}/);
    const timed = formatEventDate("2026-11-21T09:00:00Z", "2026-11-21T17:00:00Z", false, TZ);
    expect(timed).toMatch(/10:00 – 18:00$/);
    expect(formatEventDate("2026-11-20T23:00:00Z", "2026-11-22T23:00:00Z", true, TZ)).toMatch(/nov\. 21\..* – .*nov\. 23\./);
  });
});

describe("slugs", () => {
  it("turns Hungarian titles into plain addresses", () => {
    expect(slugify("Őszi Asztali Nap!")).toBe("oszi-asztali-nap");
    expect(slugify("Mikulás Kupa – 2026")).toBe("mikulas-kupa-2026");
    expect(slugify("!!!")).toBe("esemeny");
  });

  it("adds a number when the slug is taken", () => {
    expect(uniqueSlug("kupa", new Set())).toBe("kupa");
    expect(uniqueSlug("kupa", new Set(["kupa", "kupa-2"]))).toBe("kupa-3");
  });
});

describe("safeUrl", () => {
  it("allows only http and https", () => {
    expect(safeUrl("https://dthu.hu/x")).toBe("https://dthu.hu/x");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("dthu.hu")).toBeNull();
    expect(safeUrl("")).toBeNull();
  });
});

describe("parseBlocks", () => {
  it("keeps valid blocks and drops empty text", () => {
    const r = parseBlocks(
      JSON.stringify([
        { t: "h", text: " Program " },
        { t: "p", text: "" },
        { t: "p", text: "Hozd a hőseidet." },
        { t: "img", path: `${ID}/1.webp`, caption: "Tavaly" },
        { t: "link", url: "https://example.com", label: "Nevezés" },
      ]),
      ID,
    );
    expect(r).toEqual({
      ok: true,
      blocks: [
        { t: "h", text: "Program" },
        { t: "p", text: "Hozd a hőseidet." },
        { t: "img", path: `${ID}/1.webp`, caption: "Tavaly" },
        { t: "link", url: "https://example.com/", label: "Nevezés" },
      ],
    });
  });

  it("rejects unsafe links, other events' pictures and broken input", () => {
    expect(parseBlocks([{ t: "link", url: "javascript:alert(1)" }], ID).ok).toBe(false);
    expect(parseBlocks([{ t: "img", path: "other-event/1.webp" }], ID).ok).toBe(false);
    expect(parseBlocks([{ t: "img", path: `${ID}/../x.webp` }], ID).ok).toBe(false);
    expect(parseBlocks("{not json", ID).ok).toBe(false);
    expect(parseBlocks({ t: "p" }, ID).ok).toBe(false);
  });
});

describe("imagePathsInUse", () => {
  it("collects the card picture and content pictures", () => {
    const used = imagePathsInUse(`${ID}/c.webp`, [{ t: "img", path: `${ID}/1.webp` }, { t: "p", text: "x" }]);
    expect([...used].sort()).toEqual([`${ID}/1.webp`, `${ID}/c.webp`]);
  });
});

describe("sortCalendar", () => {
  const item = (key: string, startMs: number, extra: Partial<CalendarItem> = {}): CalendarItem => ({
    key,
    title: key,
    kind: "live",
    tentative: false,
    startDay: "",
    endDay: "",
    dateLabel: "",
    location: null,
    summary: null,
    cover: null,
    href: null,
    external: false,
    pinned: false,
    ongoing: false,
    past: false,
    startMs,
    endMs: startMs,
    ...extra,
  });

  it("puts pinned first, then by date; the archive newest first", () => {
    const { upcoming, past } = sortCalendar([
      item("later", 3),
      item("soon", 2),
      item("pinned", 5, { pinned: true }),
      item("old", 0, { past: true }),
      item("older", -1, { past: true }),
    ]);
    expect(upcoming.map((i) => i.key)).toEqual(["pinned", "soon", "later"]);
    expect(past.map((i) => i.key)).toEqual(["old", "older"]);
  });
});
