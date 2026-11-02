// Publishing shared by everything admins write for the site (events, news): draft → published
// now or at a set time → back to draft, page addresses (slugs) and safe links.
// Pure functions only (no database), unit-tested, usable in the browser.

import { wallTimeToUtc } from "@/features/match-organizer/lib/time";

export type PublishState = "draft" | "scheduled" | "live";

/** Draft until an admin publishes; scheduled while the go-live time is in the future. */
export function publishState(publishedAt: string | null, now: Date = new Date()): PublishState {
  if (!publishedAt) return "draft";
  return new Date(publishedAt).getTime() > now.getTime() ? "scheduled" : "live";
}

export const PUBLISH_LABELS: Record<PublishState, string> = { draft: "Piszkozat", scheduled: "Időzítve", live: "Közzétéve" };

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
        return { ok: false, error: "Add meg, mikor jelenjen meg." };
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

/** "Őszi Asztali Nap!" → "oszi-asztali-nap" (address part of an event or news page). */
export function slugify(title: string, fallback = "esemeny"): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || fallback;
}

/** The slug, or slug-2, slug-3 … when it's taken. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

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
