import { describe, expect, it } from "vitest";
import { expiresAt, isExpired, reminderDue, timeLeftToAnswer } from "./timing";

const REPORTED = "2026-11-01T12:00:00Z";
const at = (hours: number) => new Date(new Date(REPORTED).getTime() + hours * 3_600_000);
const game = (reminders_sent: number, status: "pending" | "finalized" = "pending") => ({ status, reported_at: REPORTED, reminders_sent });

describe("expiry", () => {
  it("expires exactly 7 days after the report", () => {
    expect(expiresAt(REPORTED).toISOString()).toBe("2026-11-08T12:00:00.000Z");
    expect(isExpired(game(2), at(167.9))).toBe(false);
    expect(isExpired(game(2), at(168))).toBe(true);
    expect(isExpired(game(2, "finalized"), at(500))).toBe(false);
  });
});

describe("reminderDue", () => {
  it("nothing before day 3", () => {
    expect(reminderDue(game(0), at(71.9))).toBeNull();
  });

  it("first ping on day 3, once", () => {
    expect(reminderDue(game(0), at(72))).toBe(1);
    expect(reminderDue(game(1), at(100))).toBeNull();
  });

  it("last call 24 hours before expiry, once", () => {
    expect(reminderDue(game(1), at(144))).toBe(2);
    expect(reminderDue(game(2), at(150))).toBeNull();
  });

  it("a missed first ping is skipped when the last call is due", () => {
    expect(reminderDue(game(0), at(145))).toBe(2);
  });

  it("nothing once expired or no longer pending", () => {
    expect(reminderDue(game(1), at(168))).toBeNull();
    expect(reminderDue(game(0, "finalized"), at(80))).toBeNull();
  });
});

describe("timeLeftToAnswer", () => {
  it("days for the day-3 ping, hours for the last call", () => {
    expect(timeLeftToAnswer(REPORTED, at(72))).toBe("4 nap");
    expect(timeLeftToAnswer(REPORTED, at(72.9))).toBe("4 nap");
    expect(timeLeftToAnswer(REPORTED, at(144))).toBe("24 óra");
    expect(timeLeftToAnswer(REPORTED, at(144.5))).toBe("24 óra");
  });

  it("hours from 48 down, never below 1", () => {
    expect(timeLeftToAnswer(REPORTED, at(120))).toBe("48 óra");
    expect(timeLeftToAnswer(REPORTED, at(167.99))).toBe("1 óra");
    expect(timeLeftToAnswer(REPORTED, at(200))).toBe("1 óra");
  });
});
