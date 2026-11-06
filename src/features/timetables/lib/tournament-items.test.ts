import { describe, expect, it } from "vitest";
import { tournamentCalendarItem } from "./tournament-items";

const TZ = "Europe/Budapest";
const now = new Date("2026-11-04T12:00:00Z");
const base = { id: "t1", name: "Novemberi Kupa", slug: "novemberi-kupa", format: "swiss" as const };

describe("tournamentCalendarItem", () => {
  it("shows an open tournament on its start day, linking to its page", () => {
    const item = tournamentCalendarItem({ ...base, status: "registration", starts_at: "2026-11-10T18:00:00Z" }, [], 5, TZ, now)!;
    expect(item.key).toBe("tournament:t1");
    expect(item.startDay).toBe("2026-11-10");
    expect(item.endDay).toBe("2026-11-10");
    expect(item.href).toBe("/bajnoksagok/novemberi-kupa");
    expect(item.summary).toContain("5 jelentkező");
    expect(item.ongoing).toBe(false);
    expect(item.past).toBe(false);
  });

  it("spans from the start to the last round's deadline once running", () => {
    const item = tournamentCalendarItem(
      { ...base, status: "running", starts_at: "2026-11-01T18:00:00Z" },
      [
        { starts_at: "2026-11-01T18:00:00Z", deadline: "2026-11-08T18:00:00Z", closed_at: "2026-11-05T10:00:00Z" },
        { starts_at: "2026-11-05T10:00:00Z", deadline: "2026-11-12T10:00:00Z", closed_at: null },
      ],
      8,
      TZ,
      now,
    )!;
    expect(item.startDay).toBe("2026-11-01");
    expect(item.endDay).toBe("2026-11-12");
    expect(item.ongoing).toBe(true);
  });

  it("uses the first round when the admin started it by hand", () => {
    const item = tournamentCalendarItem(
      { ...base, status: "running", starts_at: null },
      [{ starts_at: "2026-11-03T09:00:00Z", deadline: "2026-11-10T09:00:00Z", closed_at: null }],
      4,
      TZ,
      now,
    )!;
    expect(item.startDay).toBe("2026-11-03");
  });

  it("skips drafts and tournaments without any date", () => {
    expect(tournamentCalendarItem({ ...base, status: "draft", starts_at: "2026-11-10T18:00:00Z" }, [], 0, TZ, now)).toBeNull();
    expect(tournamentCalendarItem({ ...base, status: "registration", starts_at: null }, [], 0, TZ, now)).toBeNull();
  });

  it("marks finished tournaments as past", () => {
    const item = tournamentCalendarItem(
      { ...base, status: "finished", starts_at: "2026-10-01T18:00:00Z" },
      [{ starts_at: "2026-10-01T18:00:00Z", deadline: "2026-10-08T18:00:00Z", closed_at: "2026-10-07T18:00:00Z" }],
      8,
      TZ,
      now,
    )!;
    expect(item.past).toBe(true);
  });
});
