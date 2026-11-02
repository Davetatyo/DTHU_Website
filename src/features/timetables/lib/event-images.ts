// Event pictures in Supabase Storage (bucket "event-images", one folder per event).
// Server-only: service-role client, so callers (../actions) must check admin rights first.

import { IMAGE_EXTENSIONS, sniffImageType } from "@/lib/image-type";
import { createAdminClient } from "@/lib/supabase/server";
import { EVENT_IMAGE_BUCKET } from "./events-data";

/** Largest files the server accepts (the browser shrinks pictures well below this). */
export const MAX_COVER_BYTES = 600 * 1024;
export const MAX_BLOCK_IMAGE_BYTES = 900 * 1024;

/** Stores a picture under the event's folder. Returns its path, or a Hungarian error. */
export async function storeEventImage(
  eventId: string,
  role: "cover" | "block",
  bytes: Uint8Array,
): Promise<{ path: string; error: null } | { path: null; error: string }> {
  const max = role === "cover" ? MAX_COVER_BYTES : MAX_BLOCK_IMAGE_BYTES;
  if (bytes.length === 0) return { path: null, error: "Nem érkezett kép." };
  if (bytes.length > max) return { path: null, error: "A kép túl nagy. Próbáld újra, vagy válassz másik képet." };
  const type = sniffImageType(bytes);
  if (!type) return { path: null, error: "Ez nem kép, vagy nem támogatott formátum (JPG, PNG vagy WebP)." };

  const path = `${eventId}/${role}-${Date.now()}.${IMAGE_EXTENSIONS[type]}`;
  const { error } = await createAdminClient()
    .storage.from(EVENT_IMAGE_BUCKET)
    .upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  return error ? { path: null, error: "A kép feltöltése nem sikerült. Lefuttattad a 0003-as adatbázis-frissítést?" } : { path, error: null };
}

/** Deletes the event's pictures that are no longer used (removed from the content, replaced). */
export async function deleteUnusedEventImages(eventId: string, used: Set<string>): Promise<void> {
  const storage = createAdminClient().storage.from(EVENT_IMAGE_BUCKET);
  const { data } = await storage.list(eventId, { limit: 1000 });
  const unused = (data ?? []).map((f) => `${eventId}/${f.name}`).filter((p) => !used.has(p));
  if (unused.length) await storage.remove(unused);
}
