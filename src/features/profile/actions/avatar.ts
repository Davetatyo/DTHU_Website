"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { canUploadOwnAvatar } from "@/features/profile/lib/access";
import type { AvatarResult } from "@/features/profile/lib/avatar";
import { removeAvatar, saveAvatar } from "@/features/profile/lib/avatar-store";

const UUID = /^[0-9a-f-]{36}$/i;

async function bytesOf(formData: FormData): Promise<Uint8Array | null> {
  const file = formData.get("avatar");
  return file instanceof File ? new Uint8Array(await file.arrayBuffer()) : null;
}

function refreshed(error: string | null): AvatarResult {
  // Avatars show on many pages (header, match lists): refresh them all.
  if (!error) revalidatePath("/", "layout");
  return { error };
}

/** The signed-in user uploads their own picture (test phase: the owner only). */
export async function uploadMyAvatar(formData: FormData): Promise<AvatarResult> {
  const profile = await requireProfile();
  if (!canUploadOwnAvatar(profile)) return { error: "A profilkép feltöltése még tesztelés alatt áll." };
  const bytes = await bytesOf(formData);
  if (!bytes) return { error: "Nem érkezett kép." };
  return refreshed(await saveAvatar(profile.id, bytes));
}

export async function removeMyAvatar(): Promise<AvatarResult> {
  const profile = await requireProfile();
  return refreshed(await removeAvatar(profile.id));
}

/** Admin replaces another user's picture (e.g. an offensive one). */
export async function adminUploadAvatar(formData: FormData): Promise<AvatarResult> {
  await requireAdmin();
  const id = String(formData.get("profile_id") ?? "");
  if (!UUID.test(id)) return { error: "Ismeretlen felhasználó." };
  const bytes = await bytesOf(formData);
  if (!bytes) return { error: "Nem érkezett kép." };
  return refreshed(await saveAvatar(id, bytes));
}

/** Admin removes another user's picture. */
export async function adminRemoveAvatar(formData: FormData): Promise<AvatarResult> {
  await requireAdmin();
  const id = String(formData.get("profile_id") ?? "");
  if (!UUID.test(id)) return { error: "Ismeretlen felhasználó." };
  return refreshed(await removeAvatar(id));
}
