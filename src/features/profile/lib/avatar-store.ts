// Profile pictures in Supabase Storage. Server-only: uses the service-role client, so every
// caller (the actions in ../actions) must check permissions first.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, avatarObjectPath, avatarPublicUrl, checkAvatarFile } from "./avatar";

/**
 * Picture URLs of every player who uploaded one, keyed by lower-cased Karnyx name, so any
 * player avatar on a page can find its picture. One query per page request (cached).
 * Banned users' pictures are never shown. Returns an empty map before migration 0002 is run.
 */
export const getAvatarUrlsByKarnyx = cache(async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("karnyx_name, avatar_path")
    .not("karnyx_name", "is", null)
    .not("avatar_path", "is", null)
    .is("banned_at", null);
  if (error) return map;
  for (const row of data ?? []) {
    const url = avatarPublicUrl(row.avatar_path);
    if (url) map.set(String(row.karnyx_name).toLowerCase(), url);
  }
  return map;
});

/** Stores a new picture for the user and deletes the old one. Returns an error text or null. */
export async function saveAvatar(userId: string, bytes: Uint8Array): Promise<string | null> {
  const check = checkAvatarFile(bytes);
  if (!check.ok) return check.error;

  const db = createAdminClient();
  const { data: before } = await db.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
  const path = avatarObjectPath(userId, check.type);
  const { error: uploadError } = await db.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: check.type, cacheControl: "31536000", upsert: false });
  if (uploadError) return "A kép feltöltése nem sikerült, próbáld újra.";

  const { error } = await db.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (error) {
    await db.storage.from(AVATAR_BUCKET).remove([path]);
    return "A kép mentése nem sikerült, próbáld újra.";
  }
  if (before?.avatar_path) await db.storage.from(AVATAR_BUCKET).remove([before.avatar_path]);
  return null;
}

/** Deletes the user's picture (back to the default icon). Returns an error text or null. */
export async function removeAvatar(userId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
  if (!data?.avatar_path) return null;
  const { error } = await db.from("profiles").update({ avatar_path: null }).eq("id", userId);
  if (error) return "A kép törlése nem sikerült, próbáld újra.";
  await db.storage.from(AVATAR_BUCKET).remove([data.avatar_path]);
  return null;
}
