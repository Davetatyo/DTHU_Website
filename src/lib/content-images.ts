// Pictures of admin-written content (events, news) in Supabase Storage: one public bucket per
// content type, one folder per item. Server-only: service-role client, so callers must check
// admin rights first.

import { IMAGE_EXTENSIONS, sniffImageType } from "./image-type";
import { createAdminClient } from "./supabase/server";

/** Stores a picture under the item's folder. Returns its path, or a Hungarian error. */
export async function storeContentImage(
  bucket: string,
  ownerId: string,
  role: string,
  bytes: Uint8Array,
  maxBytes: number,
  migrationHint: string,
): Promise<{ path: string; error: null } | { path: null; error: string }> {
  if (bytes.length === 0) return { path: null, error: "Nem érkezett kép." };
  if (bytes.length > maxBytes) return { path: null, error: "A kép túl nagy. Próbáld újra, vagy válassz másik képet." };
  const type = sniffImageType(bytes);
  if (!type) return { path: null, error: "Ez nem kép, vagy nem támogatott formátum (JPG, PNG vagy WebP)." };

  const path = `${ownerId}/${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${IMAGE_EXTENSIONS[type]}`;
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  return error ? { path: null, error: `A kép feltöltése nem sikerült. ${migrationHint}` } : { path, error: null };
}

/** Deletes the item's pictures that are no longer used (removed from the content, replaced). */
export async function deleteUnusedContentImages(bucket: string, ownerId: string, used: Set<string>): Promise<void> {
  const storage = createAdminClient().storage.from(bucket);
  const { data } = await storage.list(ownerId, { limit: 1000 });
  const unused = (data ?? []).map((f) => `${ownerId}/${f.name}`).filter((p) => !used.has(p));
  if (unused.length) await storage.remove(unused);
}

export async function removeContentImage(bucket: string, path: string): Promise<void> {
  await createAdminClient().storage.from(bucket).remove([path]);
}
