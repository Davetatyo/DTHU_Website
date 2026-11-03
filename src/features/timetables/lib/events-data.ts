// Eseménynaptár data from Supabase. Server-only: uses the service-role client, because drafts
// must stay hidden and RLS has no public policy on events (migration 0003).

import { cache } from "react";
import { routes } from "@/lib/routes";
import { publicStorageUrl } from "@/lib/storage-url";
import { createAdminClient } from "@/lib/supabase/server";
import { dayKey } from "@/features/match-organizer/lib/time";
import { getActiveTournament, getRounds } from "@/features/match-organizer/lib/data";
import { EVENT_IMAGE_BUCKET, eventEnd, formatEventDate, publishState, type CalendarItem, type EventRow } from "./events";

export { EVENT_IMAGE_BUCKET };

export function eventImageUrl(path: string | null | undefined): string | null {
  return publicStorageUrl(EVENT_IMAGE_BUCKET, path);
}

/** Every event, drafts included (admin list). Empty before migration 0003 is run. */
export async function getAllEvents(): Promise<EventRow[]> {
  const { data, error } = await createAdminClient().from("events").select("*").order("starts_at", { ascending: false });
  return error ? [] : ((data ?? []) as EventRow[]);
}

export async function getEventById(id: string): Promise<EventRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("events").select("*").eq("id", id).maybeSingle();
  return (data as EventRow | null) ?? null;
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data } = await createAdminClient().from("events").select("*").eq("slug", slug).maybeSingle();
  return (data as EventRow | null) ?? null;
}

export function eventToItem(e: EventRow, timeZone: string, now: Date): CalendarItem {
  const end = eventEnd(e, timeZone);
  const start = new Date(e.starts_at);
  return {
    key: `ev:${e.id}`,
    title: e.title,
    kind: e.kind,
    tentative: e.tentative,
    startDay: dayKey(e.starts_at, timeZone),
    endDay: dayKey(end, timeZone),
    dateLabel: formatEventDate(e.starts_at, e.ends_at, e.all_day, timeZone),
    location: e.location,
    summary: e.summary,
    cover: eventImageUrl(e.cover_path),
    // Card-only events link straight to their own site; the rest have an event page.
    href: e.card_only ? e.link_url : routes.event(e.slug),
    external: e.card_only && !!e.link_url,
    pinned: e.pinned,
    ongoing: start <= now && now <= end,
    past: end < now,
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

/**
 * Published events by id, ready to show as "Esemény kártya" blocks in news articles. Drafts and
 * scheduled events are left out, so an article never links to an event that isn't out yet.
 */
export async function getEventCards(ids: string[], timeZone: string): Promise<Record<string, CalendarItem>> {
  if (!ids.length) return {};
  const { data, error } = await createAdminClient().from("events").select("*").in("id", ids);
  const now = new Date();
  const cards: Record<string, CalendarItem> = {};
  for (const e of error ? [] : ((data ?? []) as EventRow[])) {
    if (publishState(e.published_at, now) === "live") cards[e.id] = eventToItem(e, timeZone, now);
  }
  return cards;
}

/**
 * Everything the calendar shows: published events (scheduled ones appear by themselves once
 * their go-live time passes) and the active tournament's online rounds, which come from the
 * Időpontfoglaló so nobody types them in twice. Cached per request (page + season timeline).
 */
export const getCalendarItems = cache(async (timeZone: string): Promise<CalendarItem[]> => {
  const now = new Date();
  const { data, error } = await createAdminClient().from("events").select("*").not("published_at", "is", null);
  const events = error ? [] : ((data ?? []) as EventRow[]).filter((e) => publishState(e.published_at, now) === "live");

  const tournament = await getActiveTournament();
  const rounds = tournament ? await getRounds(tournament.id) : [];
  const roundItems: CalendarItem[] = rounds.map((r) => {
    const endIso = r.closed_at ?? r.deadline;
    const start = new Date(r.starts_at);
    const end = new Date(endIso);
    return {
      key: `round:${r.id}`,
      title: `${tournament!.name} · ${r.number}. forduló`,
      kind: "online",
      tentative: false,
      startDay: dayKey(r.starts_at, timeZone),
      endDay: dayKey(endIso, timeZone),
      dateLabel: formatEventDate(r.starts_at, endIso, false, timeZone),
      location: "Online · Discord",
      summary: "Egy hét a meccs lejátszására. Az időpontot az Időpontfoglalóban egyeztetitek.",
      cover: null,
      href: routes.organizer,
      external: false,
      pinned: false,
      ongoing: start <= now && now <= end,
      past: end < now,
      startMs: start.getTime(),
      endMs: end.getTime(),
    };
  });

  return [...events.map((e) => eventToItem(e, timeZone, now)), ...roundItems];
});
