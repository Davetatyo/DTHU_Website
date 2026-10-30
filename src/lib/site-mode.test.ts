import { describe, expect, it } from "vitest";
import { isPublicInPhase1 } from "./site-mode";

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
