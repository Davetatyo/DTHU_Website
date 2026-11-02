"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import {
  imagePathsInUse,
  parseBlocks,
  PUBLISH_LABELS,
  publishState,
  slugify,
  uniqueSlug,
  type EventImageResult,
} from "@/features/timetables/lib/events";
import { nextPublishedAt, parseEventForm, parsePublishIntent, type EventFormInput } from "@/features/timetables/lib/event-form";
import { EVENT_IMAGE_BUCKET, getEventById } from "@/features/timetables/lib/events-data";
import { deleteUnusedEventImages, storeEventImage } from "@/features/timetables/lib/event-images";
import { formatDateTime } from "@/features/match-organizer/lib/time";

const MIGRATION_HINT = "Lefuttattad a 0003-as adatbázis-frissítést?";

function formInput(formData: FormData): EventFormInput {
  const input: EventFormInput = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") input[key] = value;
  return input;
}

function go(url: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath("/", "layout");
  redirect(`${url}?${key}=${encodeURIComponent(text)}`);
}

/** "Új esemény": saves a draft and opens it for editing (content, pictures, publishing). */
export async function createEvent(formData: FormData) {
  const me = await requireAdmin();
  const parsed = parseEventForm(formInput(formData), me.timezone);
  if (!parsed.ok) go(routes.adminEventNew, "hiba", parsed.error);
  const fields = parsed.fields;

  const db = createAdminClient();
  const base = slugify(fields.title);
  const { data: similar } = await db.from("events").select("slug").like("slug", `${base}%`);
  const slug = uniqueSlug(base, new Set((similar ?? []).map((r) => r.slug as string)));

  const { data, error } = await db
    .from("events")
    .insert({ ...fields, slug, created_by: me.id, updated_by: me.id })
    .select("id")
    .single();
  if (error || !data) go(routes.adminEventNew, "hiba", `Az esemény mentése nem sikerült. ${MIGRATION_HINT}`);
  go(routes.adminEvent(data.id), "uzenet", "Piszkozat elmentve. Add hozzá a képet és a leírást, majd tedd közzé.");
}

/** Saves the edit form; the pressed button decides publishing (save / now / scheduled / back to draft). */
export async function saveEvent(formData: FormData) {
  const me = await requireAdmin();
  const event = await getEventById(String(formData.get("event_id") ?? ""));
  if (!event) go(routes.adminEvents, "hiba", "Az esemény nem található.");
  const url = routes.adminEvent(event.id);

  const input = formInput(formData);
  const parsed = parseEventForm(input, me.timezone);
  if (!parsed.ok) go(url, "hiba", parsed.error);
  const blocks = parseBlocks(input.body ?? "[]", event.id);
  if (!blocks.ok) go(url, "hiba", blocks.error);
  const intent = parsePublishIntent(input.intent, input.publish_at, me.timezone);
  if (!intent.ok) go(url, "hiba", intent.error);

  const publishedAt = nextPublishedAt(event.published_at, intent.intent);
  const { error } = await createAdminClient()
    .from("events")
    .update({ ...parsed.fields, body: blocks.blocks, published_at: publishedAt, updated_by: me.id, updated_at: new Date().toISOString() })
    .eq("id", event.id);
  if (error) go(url, "hiba", "A mentés nem sikerült, próbáld újra.");

  await deleteUnusedEventImages(event.id, imagePathsInUse(event.cover_path, blocks.blocks));

  const state = publishState(publishedAt);
  const message =
    intent.intent.kind === "publish_now"
      ? "Közzétéve: az esemény most már látszik az Eseménynaptárban."
      : intent.intent.kind === "schedule"
        ? `Időzítve: ${formatDateTime(publishedAt ?? "", me.timezone)}-kor jelenik meg magától.`
        : intent.intent.kind === "unpublish"
          ? "Visszavonva: az esemény újra piszkozat, nem látszik a naptárban."
          : `Elmentve (${PUBLISH_LABELS[state].toLowerCase()}).`;
  go(url, "uzenet", message);
}

/** Deletes an event and all its pictures. */
export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const event = await getEventById(String(formData.get("event_id") ?? ""));
  if (!event) go(routes.adminEvents, "hiba", "Az esemény nem található.");
  const { error } = await createAdminClient().from("events").delete().eq("id", event.id);
  if (error) go(routes.adminEvent(event.id), "hiba", "A törlés nem sikerült, próbáld újra.");
  await deleteUnusedEventImages(event.id, new Set());
  go(routes.adminEvents, "uzenet", `„${event.title}” törölve.`);
}

/**
 * Uploads a picture (already shrunk in the browser). The card picture ("cover") is saved on
 * the event right away; content pictures ("block") are kept once the form is saved.
 */
export async function uploadEventImage(formData: FormData): Promise<EventImageResult> {
  await requireAdmin();
  const event = await getEventById(String(formData.get("event_id") ?? ""));
  if (!event) return { path: null, error: "Az esemény nem található." };
  const role = formData.get("role") === "cover" ? "cover" : "block";
  const file = formData.get("image");
  if (!(file instanceof File)) return { path: null, error: "Nem érkezett kép." };

  const stored = await storeEventImage(event.id, role, new Uint8Array(await file.arrayBuffer()));
  if (stored.error) return stored;
  if (role === "cover") {
    const { error } = await createAdminClient().from("events").update({ cover_path: stored.path }).eq("id", event.id);
    if (error) return { path: null, error: "A kép mentése nem sikerült, próbáld újra." };
    if (event.cover_path) await createAdminClient().storage.from(EVENT_IMAGE_BUCKET).remove([event.cover_path]);
    revalidatePath("/", "layout");
  }
  return stored;
}

/** Removes the card picture (the tile falls back to the kind's colours). */
export async function removeEventCover(formData: FormData): Promise<EventImageResult> {
  await requireAdmin();
  const event = await getEventById(String(formData.get("event_id") ?? ""));
  if (!event) return { path: null, error: "Az esemény nem található." };
  if (!event.cover_path) return { path: null, error: null };
  const { error } = await createAdminClient().from("events").update({ cover_path: null }).eq("id", event.id);
  if (error) return { path: null, error: "A kép törlése nem sikerült, próbáld újra." };
  await createAdminClient().storage.from(EVENT_IMAGE_BUCKET).remove([event.cover_path]);
  revalidatePath("/", "layout");
  return { path: null, error: null };
}
