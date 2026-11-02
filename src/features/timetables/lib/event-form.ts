// The admin event form: reading and checking what was typed, and filling the form back in.
// Pure (no database), unit-tested. Dates and times are typed in the admin's own time zone.

import { utcToWallTime, wallTimeToUtc } from "@/features/match-organizer/lib/time";
import { isEventKind, safeUrl, type EventKind, type EventRow } from "./events";

/** Form values as strings, the way <input>s send them (checkboxes: "on" or missing). */
export type EventFormInput = Record<string, string | undefined>;

export type EventFields = {
  title: string;
  kind: EventKind;
  tentative: boolean;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  summary: string | null;
  link_url: string | null;
  card_only: boolean;
  pinned: boolean;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const str = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max);

/**
 * Checks the form. No start time = all-day event. An end date without an end time ends at
 * the end of that day. Returns the database fields or a Hungarian error.
 */
export function parseEventForm(input: EventFormInput, timeZone: string): { ok: true; fields: EventFields } | { ok: false; error: string } {
  const title = str(input.title, 120);
  if (!title) return { ok: false, error: "Add meg az esemény címét." };
  if (!isEventKind(input.kind)) return { ok: false, error: "Válaszd ki az esemény fajtáját." };

  const startDate = str(input.start_date, 10);
  const startTime = str(input.start_time, 5);
  const endDate = str(input.end_date, 10);
  const endTime = str(input.end_time, 5);
  if (!DATE.test(startDate)) return { ok: false, error: "Add meg a kezdés napját." };
  if (startTime && !TIME.test(startTime)) return { ok: false, error: "Érvénytelen kezdési idő." };
  if (endDate && !DATE.test(endDate)) return { ok: false, error: "Érvénytelen befejezési nap." };
  if (endTime && !TIME.test(endTime)) return { ok: false, error: "Érvénytelen befejezési idő." };

  const allDay = !startTime;
  const start = wallTimeToUtc(`${startDate}T${allDay ? "00:00" : startTime}`, timeZone);
  let end: Date | null = null;
  if (allDay) {
    if (endDate) end = wallTimeToUtc(`${endDate}T00:00`, timeZone);
  } else if (endTime || endDate) {
    end = wallTimeToUtc(`${endDate || startDate}T${endTime || "23:59"}`, timeZone);
  }
  if (end && end < start) return { ok: false, error: "A befejezés nem lehet a kezdés előtt." };

  const rawLink = str(input.link_url, 500);
  const link = rawLink ? safeUrl(rawLink) : null;
  if (rawLink && !link) return { ok: false, error: "A link http:// vagy https:// kezdetű cím legyen." };
  const cardOnly = input.card_only === "on";
  if (cardOnly && !link) return { ok: false, error: "A „csak kártya” eseményhez add meg az esemény oldalának linkjét." };

  return {
    ok: true,
    fields: {
      title,
      kind: input.kind,
      tentative: input.tentative === "on",
      starts_at: start.toISOString(),
      ends_at: end ? end.toISOString() : null,
      all_day: allDay,
      location: str(input.location, 200) || null,
      summary: str(input.summary, 600) || null,
      link_url: link,
      card_only: cardOnly,
      pinned: input.pinned === "on",
    },
  };
}

/** The form's date and time boxes for an existing event, in the admin's time zone. */
export function eventFormDefaults(e: EventRow, timeZone: string) {
  const start = utcToWallTime(new Date(e.starts_at), timeZone);
  const end = e.ends_at ? utcToWallTime(new Date(e.ends_at), timeZone) : null;
  return {
    start_date: start.slice(0, 10),
    start_time: e.all_day ? "" : start.slice(11, 16),
    end_date: end ? end.slice(0, 10) : "",
    end_time: end && !e.all_day ? end.slice(11, 16) : "",
  };
}

export type PublishIntent =
  | { kind: "save" }
  | { kind: "publish_now" }
  | { kind: "schedule"; at: string }
  | { kind: "unpublish" };

/** Which button was pressed; "Időzítés" needs a go-live time in the future. */
export function parsePublishIntent(
  intent: string | undefined,
  publishAt: string | undefined,
  timeZone: string,
  now: Date = new Date(),
): { ok: true; intent: PublishIntent } | { ok: false; error: string } {
  switch (intent) {
    case "publish_now":
      return { ok: true, intent: { kind: "publish_now" } };
    case "unpublish":
      return { ok: true, intent: { kind: "unpublish" } };
    case "schedule": {
      if (!publishAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(publishAt)) {
        return { ok: false, error: "Add meg, mikor jelenjen meg az esemény." };
      }
      const at = wallTimeToUtc(publishAt, timeZone);
      if (at <= now) return { ok: false, error: "Az időzített megjelenés a jövőben legyen (vagy válaszd a „Közzététel most” gombot)." };
      return { ok: true, intent: { kind: "schedule", at: at.toISOString() } };
    }
    default:
      return { ok: true, intent: { kind: "save" } };
  }
}

/** published_at after the button: unchanged on a plain save. */
export function nextPublishedAt(current: string | null, intent: PublishIntent, now: Date = new Date()): string | null {
  switch (intent.kind) {
    case "publish_now":
      return now.toISOString();
    case "schedule":
      return intent.at;
    case "unpublish":
      return null;
    default:
      return current;
  }
}
