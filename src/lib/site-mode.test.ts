import { describe, expect, it } from "vitest";
import { isPublicInPhase1, phase1Fallback } from "./site-mode";

describe("isPublicInPhase1", () => {
  it("keeps the Meccsszervező, auth and API public", () => {
    for (const p of ["/meccsszervezo", "/meccsszervezo/meccs/abc", "/auth/callback", "/api/calendar", "/api/cron/reminders"]) {
      expect(isPublicInPhase1(p)).toBe(true);
    }
  });

  it("hides the rest of the site", () => {
    for (const p of ["/", "/ranglista", "/bolt", "/meccsszervezok", "/apis"]) {
      expect(isPublicInPhase1(p)).toBe(false);
    }
  });
});

describe("phase1Fallback", () => {
  it("sends old /gyik links to the Meccsszervező FAQ, everything else to its overview", () => {
    expect(phase1Fallback("/gyik")).toBe("/meccsszervezo/gyik");
    expect(phase1Fallback("/ranglista")).toBe("/meccsszervezo");
  });
});
