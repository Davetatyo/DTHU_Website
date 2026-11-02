// Eseménynaptár events: kinds, publish states, content blocks and the calendar view model.
// Pure functions only (no database), so they are unit-tested and usable in the browser.

import { dayKey, wallTimeToUtc } from "@/features/match-organizer/lib/time";

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

// ---------- publishing ----------

export type PublishState = "draft" | "scheduled" | "live";

/** Draft until an admin publishes; scheduled while the go-live time is in the future. */
export function publishState(publishedAt: string | null, now: Date = new Date()): PublishState {
  if (!publishedAt) return "draft";
  return new Date(publishedAt).getTime() > now.getTime() ? "scheduled" : "live";
}

export const PUBLISH_LABELS: Record<PublishState, string> = { draft: "Piszkozat", scheduled: "Időzítve", live: "Közzétéve" };

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

// ---------- slugs ----------

/** "Őszi Asztali Nap!" → "oszi-asztali-nap" (address part of the event page). */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "esemeny";
}

/** The slug, or slug-2, slug-3 … when it's taken. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

// ---------- content blocks ----------

export type EventBlock =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "img"; path: string; caption?: string }
  | { t: "link"; url: string; label?: string };

const MAX_BLOCKS = 100;
const MAX_TEXT = 5000;

/** Only http(s) links (no javascript: and the like). Returns the normalised URL or null. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** A picture path of this event in the event-images bucket: "<event id>/<file>". */
export function isOwnImagePath(path: unknown, eventId: string): path is string {
  return typeof path === "string" && new RegExp(`^${eventId}/[A-Za-z0-9._-]+$`).test(path);
}

const text = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_TEXT) : "");

/**
 * Checks the block list the editor sends (JSON). Empty text blocks are dropped; links must be
 * http(s); pictures must belong to this event. Returns the clean list or a Hungarian error.
 */
export function parseBlocks(input: unknown, eventId: string): { ok: true; blocks: EventBlock[] } | { ok: false; error: string } {
  let raw = input;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw || "[]");
    } catch {
      return { ok: false, error: "A tartalom nem olvasható, töltsd újra az oldalt." };
    }
  }
  if (!Array.isArray(raw)) return { ok: false, error: "A tartalom nem olvasható, töltsd újra az oldalt." };
  if (raw.length > MAX_BLOCKS) return { ok: false, error: `Legfeljebb ${MAX_BLOCKS} blokk lehet egy eseményben.` };

  const blocks: EventBlock[] = [];
  for (const b of raw as Record<string, unknown>[]) {
    if (!b || typeof b !== "object") continue;
    if (b.t === "h" || b.t === "p") {
      const t = text(b.text);
      if (t) blocks.push({ t: b.t, text: t });
    } else if (b.t === "img") {
      if (!isOwnImagePath(b.path, eventId)) return { ok: false, error: "Egy kép hibás, töröld és töltsd fel újra." };
      const caption = text(b.caption);
      blocks.push(caption ? { t: "img", path: b.path, caption } : { t: "img", path: b.path });
    } else if (b.t === "link") {
      const url = safeUrl(b.url);
      if (!url) return { ok: false, error: "Egy link hibás: http:// vagy https:// kezdetű címet adj meg." };
      const label = text(b.label);
      blocks.push(label ? { t: "link", url, label } : { t: "link", url });
    }
  }
  return { ok: true, blocks };
}

/** What the picture upload actions return to the editors in the browser. */
export type EventImageResult = { path: string | null; error: string | null };

/** Pictures the event still uses (card picture + pictures in the content). */
export function imagePathsInUse(coverPath: string | null, blocks: EventBlock[]): Set<string> {
  const used = new Set<string>();
  if (coverPath) used.add(coverPath);
  for (const b of blocks) if (b.t === "img") used.add(b.path);
  return used;
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
