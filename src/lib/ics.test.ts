import { describe, expect, it } from "vitest";
import { buildCalendar, googleCalendarUrl } from "./ics";

const event = {
  uid: "abc@dt-match-organizer",
  start: new Date("2026-10-28T19:00:00Z"),
  title: "Dice Throne 1. forduló: Dave vs ZenBulldozer",
  description: "Hősök: Alchemist, Vampire Lord; Spider-Man",
  url: "https://example.vercel.app/meccs/abc",
};

describe("buildCalendar", () => {
  const ics = buildCalendar("DT verseny", [event], new Date("2026-10-26T10:00:00Z"));

  it("produces a valid event with UTC times", () => {
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261028T190000Z");
    expect(ics).toContain("DTEND:20261028T200000Z");
    expect(ics).toContain("DTSTAMP:20261026T100000Z");
  });

  it("escapes commas and semicolons", () => {
    expect(ics).toContain("DESCRIPTION:Hősök: Alchemist\\, Vampire Lord\\; Spider-Man");
  });

  it("uses CRLF and keeps lines within 75 bytes", () => {
    const long = buildCalendar("x", [{ ...event, description: "árvíztűrő tükörfúrógép ".repeat(10) }]);
    for (const line of long.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe("googleCalendarUrl", () => {
  it("contains the event dates", () => {
    expect(googleCalendarUrl(event)).toContain("dates=20261028T190000Z%2F20261028T200000Z");
  });
});
