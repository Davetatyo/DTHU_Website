import { describe, expect, it } from "vitest";
import { eventFormDefaults, nextPublishedAt, parseEventForm, parsePublishIntent } from "./event-form";
import type { EventRow } from "./events";

const TZ = "Europe/Budapest";
const base = { title: "Őszi Asztali Nap", kind: "community", start_date: "2026-11-21" };

describe("parseEventForm", () => {
  it("makes an all-day event when there is no start time", () => {
    const r = parseEventForm(base, TZ);
    expect(r.ok && r.fields).toMatchObject({ all_day: true, starts_at: "2026-11-20T23:00:00.000Z", ends_at: null, card_only: false });
  });

  it("converts times from the admin's time zone and ends without end time at the end of the day", () => {
    const timed = parseEventForm({ ...base, start_time: "10:00", end_time: "18:00" }, TZ);
    expect(timed.ok && timed.fields).toMatchObject({ all_day: false, starts_at: "2026-11-21T09:00:00.000Z", ends_at: "2026-11-21T17:00:00.000Z" });
    const twoDays = parseEventForm({ ...base, start_time: "10:00", end_date: "2026-11-22" }, TZ);
    expect(twoDays.ok && twoDays.fields.ends_at).toBe("2026-11-22T22:59:00.000Z");
  });

  it("reads checkboxes and trims text", () => {
    const r = parseEventForm({ ...base, tentative: "on", pinned: "on", location: "  Budapest ", summary: " " }, TZ);
    expect(r.ok && r.fields).toMatchObject({ tentative: true, pinned: true, location: "Budapest", summary: null });
  });

  it("rejects missing or wrong values", () => {
    expect(parseEventForm({ ...base, title: " " }, TZ).ok).toBe(false);
    expect(parseEventForm({ ...base, kind: "party" }, TZ).ok).toBe(false);
    expect(parseEventForm({ ...base, start_date: "" }, TZ).ok).toBe(false);
    expect(parseEventForm({ ...base, start_time: "10:00", end_time: "09:00" }, TZ).ok).toBe(false);
    expect(parseEventForm({ ...base, link_url: "javascript:alert(1)" }, TZ).ok).toBe(false);
  });

  it("needs a link for card-only events", () => {
    expect(parseEventForm({ ...base, card_only: "on" }, TZ).ok).toBe(false);
    const r = parseEventForm({ ...base, card_only: "on", link_url: "https://example.com/nevezes" }, TZ);
    expect(r.ok && r.fields).toMatchObject({ card_only: true, link_url: "https://example.com/nevezes" });
  });
});

describe("eventFormDefaults", () => {
  it("fills the date and time boxes back in the admin's time zone", () => {
    const row = { starts_at: "2026-11-21T09:00:00Z", ends_at: "2026-11-21T17:00:00Z", all_day: false } as EventRow;
    expect(eventFormDefaults(row, TZ)).toEqual({ start_date: "2026-11-21", start_time: "10:00", end_date: "2026-11-21", end_time: "18:00" });
    const allDay = { starts_at: "2026-11-20T23:00:00Z", ends_at: null, all_day: true } as EventRow;
    expect(eventFormDefaults(allDay, TZ)).toEqual({ start_date: "2026-11-21", start_time: "", end_date: "", end_time: "" });
  });
});

describe("publishing", () => {
  const now = new Date("2026-11-03T12:00:00Z");

  it("reads the pressed button; scheduling needs a future time", () => {
    expect(parsePublishIntent(undefined, undefined, TZ, now)).toEqual({ ok: true, intent: { kind: "save" } });
    expect(parsePublishIntent("publish_now", undefined, TZ, now)).toEqual({ ok: true, intent: { kind: "publish_now" } });
    expect(parsePublishIntent("schedule", "2026-11-04T08:00", TZ, now)).toEqual({
      ok: true,
      intent: { kind: "schedule", at: "2026-11-04T07:00:00.000Z" },
    });
    expect(parsePublishIntent("schedule", "2026-11-01T08:00", TZ, now).ok).toBe(false);
    expect(parsePublishIntent("schedule", "", TZ, now).ok).toBe(false);
  });

  it("sets the go-live time: now, scheduled, cleared, or unchanged on a plain save", () => {
    expect(nextPublishedAt(null, { kind: "publish_now" }, now)).toBe(now.toISOString());
    expect(nextPublishedAt(null, { kind: "schedule", at: "2026-11-04T07:00:00.000Z" }, now)).toBe("2026-11-04T07:00:00.000Z");
    expect(nextPublishedAt("2026-11-01T00:00:00Z", { kind: "unpublish" }, now)).toBeNull();
    expect(nextPublishedAt("2026-11-01T00:00:00Z", { kind: "save" }, now)).toBe("2026-11-01T00:00:00Z");
  });
});
