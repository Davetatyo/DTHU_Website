import { describe, expect, it } from "vitest";
import { formatDateTime, formatShortDate, pickerDays, timeLeft, utcToWallTime, wallTimeToUtc } from "./time";

describe("pickerDays", () => {
  it("lists every day from min to max, inclusive", () => {
    const days = pickerDays("2026-10-30T21:15", "2026-11-02T10:00");
    expect(days.map((d) => d.key)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(days[0].day).toBe(30);
    expect(days[2].month).toContain("nov");
  });

  it("caps very long ranges", () => {
    expect(pickerDays("2026-10-01T00:00", "2027-01-01T00:00")).toHaveLength(21);
  });
});

describe("wallTimeToUtc", () => {
  it("converts Budapest summer time (UTC+2)", () => {
    expect(wallTimeToUtc("2026-07-15T20:00", "Europe/Budapest").toISOString()).toBe("2026-07-15T18:00:00.000Z");
  });

  it("converts Budapest winter time (UTC+1)", () => {
    expect(wallTimeToUtc("2026-10-28T20:00", "Europe/Budapest").toISOString()).toBe("2026-10-28T19:00:00.000Z");
  });

  it("handles other zones", () => {
    expect(wallTimeToUtc("2026-10-28T20:00", "America/New_York").toISOString()).toBe("2026-10-29T00:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(() => wallTimeToUtc("holnap", "Europe/Budapest")).toThrow();
  });
});

describe("utcToWallTime", () => {
  it("round-trips with wallTimeToUtc", () => {
    const utc = wallTimeToUtc("2026-03-29T21:30", "Europe/Budapest");
    expect(utcToWallTime(utc, "Europe/Budapest")).toBe("2026-03-29T21:30");
  });
});

describe("formatDateTime", () => {
  it("formats in Hungarian", () => {
    const text = formatDateTime("2026-10-28T19:00:00Z");
    expect(text).toContain("20:00");
    expect(text).toContain("okt");
  });
});

describe("formatShortDate", () => {
  it("shows month, day and weekday without the time", () => {
    const text = formatShortDate("2026-10-30T18:15:00Z", "Europe/Budapest");
    expect(text).toContain("okt");
    expect(text).toContain("30");
    expect(text).not.toContain(":");
  });
});

describe("timeLeft", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  it("counts days and hours", () => {
    expect(timeLeft("2026-11-02T11:25:00Z", now)).toBe("2 nap 23 óra");
  });
  it("shows only hours on the last day", () => {
    expect(timeLeft("2026-10-30T17:30:00Z", now)).toBe("5 óra");
  });
  it("says lejárt after the deadline", () => {
    expect(timeLeft("2026-10-30T11:00:00Z", now)).toBe("lejárt");
  });
});
