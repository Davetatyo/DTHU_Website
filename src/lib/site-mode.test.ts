import { describe, expect, it } from "vitest";
import { isLoginGatedInPhase1, isPublicInPhase1, phase1Fallback } from "./site-mode";

describe("isPublicInPhase1", () => {
  it("keeps registration, auth and API public", () => {
    for (const p of ["/regisztracio", "/auth/callback", "/api/calendar", "/api/cron/reminders"]) {
      expect(isPublicInPhase1(p)).toBe(true);
    }
  });

  it("hides the rest of the site", () => {
    for (const p of ["/", "/ranglista", "/bolt", "/meccsszervezok", "/apis"]) {
      expect(isPublicInPhase1(p)).toBe(false);
    }
  });
});

describe("isLoginGatedInPhase1", () => {
  it("gates the Meccsszervező behind login", () => {
    for (const p of ["/meccsszervezo", "/meccsszervezo/meccs/abc"]) {
      expect(isLoginGatedInPhase1(p)).toBe(true);
    }
  });

  it("does not gate public or other paths", () => {
    for (const p of ["/regisztracio", "/auth/callback", "/ranglista"]) {
      expect(isLoginGatedInPhase1(p)).toBe(false);
    }
  });
});

describe("phase1Fallback", () => {
  it("sends old /gyik links to the Meccsszervező FAQ, everything else to its overview", () => {
    expect(phase1Fallback("/gyik")).toBe("/meccsszervezo/gyik");
    expect(phase1Fallback("/ranglista")).toBe("/meccsszervezo");
  });
});

