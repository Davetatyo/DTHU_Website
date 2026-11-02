// Eseménynaptár events: kinds, publish states, content blocks and the calendar view model.
// Pure functions only (no database), so they are unit-tested and usable in the browser.

import { dayKey, wallTimeToUtc } from "@/features/match-organizer/lib/time";
import { parseBlocks as parseContentBlocks, SIMPLE_BLOCKS, type ContentBlock } from "@/lib/content-blocks";

/** Storage bucket for event pictures (supabase/migrations/0003_events.sql). */
export const EVENT_IMAGE_BUCKET = "event-images";

export const EVENT_KINDS = ["online", "live", "community", "other"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const KIND_LABELS: Record<EventKind, string> = {
  online: "Online bajnokság",
  live: "Élő verseny",
  community: "Asztali nap / közösségi játék",
  other: "Egyéb",
};
export const TENTATIVE_LABEL = "Ötlet / tervezett";

/** Short kind labels for the small tag on calendar cards, so it never reaches the date badge. */
export const KIND_SHORT_LABELS: Record<EventKind, string> = {
  online: "Online",
  live: "Élő verseny",
  community: "Közösségi játék",
  other: "Egyéb",
};

export function isEventKind(value: unknown): value is EventKind {
  return typeof value === "string" && (EVENT_KINDS as readonly string[]).includes(value);
}

/** One row of public.events (supabase/migrations/0003_events.sql). */
export type EventRow = {
  id: string;
  slug: string;
  title: string;
  kind: EventKind;
  tentative: boolean;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  summary: string | null;
  body: unknown;
  cover_path: string | null;
  link_url: string | null;
  card_only: boolean;
  pinned: boolean;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

// ---------- publishing (shared with news, see src/lib/publishing.ts) ----------

export { publishState, PUBLISH_LABELS, type PublishState } from "@/lib/publishing";

// ---------- dates ----------

/** The last minute of the day `value` falls on, in the given time zone. */
export function endOfDay(value: string | Date, timeZone: string): Date {
  return wallTimeToUtc(`${dayKey(value, timeZone)}T23:59`, timeZone);
}

/**
 * When an event is over: its end time, or the end of its (last) day for all-day events and
 * for events without an end time.
 */
export function eventEnd(e: Pick<EventRow, "starts_at" | "ends_at" | "all_day">, timeZone: string): Date {
  if (e.all_day) return endOfDay(e.ends_at ?? e.starts_at, timeZone);
  return e.ends_at ? new Date(e.ends_at) : endOfDay(e.starts_at, timeZone);
}

const dateFmt = (tz: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("hu-HU", { timeZone: tz, ...opts });

/**
 * Human date of an event: "nov. 21., szo." (all day), "nov. 21. – nov. 23." (several days),
 * "nov. 21., szo. 10:00 – 18:00" (timed), "nov. 21., szo. 10:00 – nov. 22., v. 18:00".
 */
export function formatEventDate(start: string, end: string | null, allDay: boolean, timeZone: string): string {
  const day = (v: string) => dateFmt(timeZone, { month: "short", day: "numeric", weekday: "short" }).format(new Date(v));
  const time = (v: string) => dateFmt(timeZone, { hour: "2-digit", minute: "2-digit" }).format(new Date(v));
  const sameDay = !end || dayKey(start, timeZone) === dayKey(end, timeZone);
  if (allDay) return sameDay ? day(start) : `${day(start)} – ${day(end!)}`;
  if (!end) return `${day(start)} ${time(start)}`;
  return sameDay ? `${day(start)} ${time(start)} – ${time(end)}` : `${day(start)} ${time(start)} – ${day(end)} ${time(end)}`;
}

// ---------- slugs, links and content blocks (shared, see src/lib) ----------

export { slugify, uniqueSlug, safeUrl } from "@/lib/publishing";
export { imagePathsInUse, isOwnImagePath, type ContentImageResult as EventImageResult } from "@/lib/content-blocks";

/** Events use the simple blocks only (owner, 2026-11-03). */
export type EventBlock = Extract<ContentBlock, { t: "h" | "p" | "img" | "link" }>;

/** Checks an event's block list: the simple blocks, pictures from the event's own folder. */
export function parseBlocks(input: unknown, eventId: string): { ok: true; blocks: EventBlock[] } | { ok: false; error: string } {
  const r = parseContentBlocks(input, eventId, SIMPLE_BLOCKS);
  return r.ok ? { ok: true, blocks: r.blocks as EventBlock[] } : r;
}

// ---------- calendar view model ----------

/** One entry on the Eseménynaptár page (an event or an online round), ready for the browser. */
export type CalendarItem = {
  key: string;
  title: string;
  kind: EventKind;
  tentative: boolean;
  /** Days it covers, in the viewer's time zone (YYYY-MM-DD). */
  startDay: string;
  endDay: string;
  dateLabel: string;
  location: string | null;
  summary: string | null;
  cover: string | null;
  /** Where a click goes; null opens the details popup. */
  href: string | null;
  external: boolean;
  pinned: boolean;
  ongoing: boolean;
  past: boolean;
  /** Start and end as timestamps (ms), for sorting and progress bars. */
  startMs: number;
  endMs: number;
};

export function sortCalendar(items: CalendarItem[]): { upcoming: CalendarItem[]; past: CalendarItem[] } {
  const upcoming = items
    .filter((i) => !i.past)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.startMs - b.startMs);
  const past = items.filter((i) => i.past).sort((a, b) => b.startMs - a.startMs);
  return { upcoming, past };
}
