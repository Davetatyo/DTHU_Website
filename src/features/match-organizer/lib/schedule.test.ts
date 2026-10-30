import { describe, expect, it } from "vitest";
import { dayTitle, groupMatches } from "./schedule";

const TZ = "Europe/Budapest";
const now = new Date("2026-10-30T10:00:00Z");

describe("dayTitle", () => {
  it("names today, tomorrow and yesterday", () => {
    expect(dayTitle("2026-10-30T18:00:00Z", TZ, now).title).toBe("Ma");
    expect(dayTitle("2026-10-31T12:00:00Z", TZ, now).title).toBe("Holnap");
    expect(dayTitle("2026-10-29T17:00:00Z", TZ, now).title).toBe("Tegnap");
  });

  it("uses the weekday further away", () => {
    const t = dayTitle("2026-11-02T10:00:00Z", TZ, now);
    expect(t.title).toBe("hétfő");
    expect(t.sub).toContain("november 2.");
  });
});

describe("groupMatches", () => {
  const m = (id: string, status: string, scheduled_at: string | null = null) => ({ id, status, scheduled_at });

  it("orders days first, then open, played and Bye groups", () => {
    const groups = groupMatches(
      [
        m("a", "played"),
        m("b", "confirmed", "2026-10-31T12:00:00Z"),
        m("c", "pending"),
        m("d", "confirmed", "2026-10-30T18:00:00Z"),
        m("e", "bye"),
        m("f", "proposed"),
        m("g", "confirmed", "2026-10-30T07:00:00Z"),
      ],
      TZ,
      now,
    );
    expect(groups.map((g) => g.title)).toEqual(["Ma", "Holnap", "Egyeztetés alatt", "Lejátszott", "Pihenő"]);
    expect(groups[0].matches.map((x) => x.id)).toEqual(["g", "d"]);
    expect(groups[2].matches.map((x) => x.id)).toEqual(["c", "f"]);
  });

  it("leaves out empty groups", () => {
    expect(groupMatches([m("a", "played")], TZ, now).map((g) => g.key)).toEqual(["played"]);
  });
});
