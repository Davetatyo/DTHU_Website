import { describe, expect, it } from "vitest";
import { formatDateTime, utcToWallTime, wallTimeToUtc } from "./time";

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
