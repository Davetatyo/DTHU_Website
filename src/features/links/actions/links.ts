"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import type { ContentImageResult } from "@/lib/content-blocks";
import { deleteUnusedContentImages, removeContentImage, storeContentImage } from "@/lib/content-images";
import { LINK_IMAGE_BUCKET, nextSortOrder, parseLinkForm, reorder } from "@/features/links/lib/links";
import { getAllLinks, getLinkById } from "@/features/links/lib/links-data";

const MIGRATION_HINT = "Lefuttattad a 0006-os adatbázis-frissítést?";

function formInput(formData: FormData): Record<string, string> {
  const input: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") input[key] = value;
  return input;
}

function go(url: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath("/", "layout");
  redirect(`${url}?${key}=${encodeURIComponent(text)}`);
}

/** "Új link": saves it at the end of the list and opens it, so a picture can be added. */
export async function createLink(formData: FormData) {
  const me = await requireAdmin();
  const parsed = parseLinkForm({ ...formInput(formData), visible: "on" });
  if (!parsed.ok) go(routes.adminLinkNew, "hiba", parsed.error);
  const { data, error } = await createAdminClient()
    .from("links")
    .insert({ ...parsed.fields, sort_order: nextSortOrder(await getAllLinks()), created_by: me.id, updated_by: me.id })
    .select("id")
    .single();
  if (error || !data) go(routes.adminLinkNew, "hiba", `A link mentése nem sikerült. ${MIGRATION_HINT}`);
  go(routes.adminLink(data.id), "uzenet", "Link elmentve, már látszik a Linkek oldalon. Ha szeretnél, adj hozzá képet.");
}

export async function saveLink(formData: FormData) {
  const me = await requireAdmin();
  const link = await getLinkById(String(formData.get("link_id") ?? ""));
  if (!link) go(routes.adminLinks, "hiba", "A link nem található.");
  const parsed = parseLinkForm(formInput(formData));
  if (!parsed.ok) go(routes.adminLink(link.id), "hiba", parsed.error);
  const { error } = await createAdminClient()
    .from("links")
    .update({ ...parsed.fields, updated_by: me.id, updated_at: new Date().toISOString() })
    .eq("id", link.id);
  if (error) go(routes.adminLink(link.id), "hiba", "A mentés nem sikerült, próbáld újra.");
  go(routes.adminLinks, "uzenet", parsed.fields.visible ? `„${parsed.fields.title}” elmentve.` : `„${parsed.fields.title}” elmentve (rejtett).`);
}

export async function deleteLink(formData: FormData) {
  await requireAdmin();
  const link = await getLinkById(String(formData.get("link_id") ?? ""));
  if (!link) go(routes.adminLinks, "hiba", "A link nem található.");
  const { error } = await createAdminClient().from("links").delete().eq("id", link.id);
  if (error) go(routes.adminLink(link.id), "hiba", "A törlés nem sikerült, próbáld újra.");
  await deleteUnusedContentImages(LINK_IMAGE_BUCKET, link.id, new Set());
  go(routes.adminLinks, "uzenet", `„${link.title}” törölve.`);
}

/** ↑ / ↓ on the admin list. */
export async function moveLink(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("link_id") ?? "");
  const dir = formData.get("dir") === "up" ? -1 : 1;
  const db = createAdminClient();
  for (const change of reorder(await getAllLinks(), id, dir)) {
    await db.from("links").update({ sort_order: change.sort_order }).eq("id", change.id);
  }
  revalidatePath("/", "layout");
  redirect(routes.adminLinks);
}

/** The link's picture (already cropped and shrunk in the browser); saved right away. */
export async function uploadLinkImage(formData: FormData): Promise<ContentImageResult> {
  await requireAdmin();
  const link = await getLinkById(String(formData.get("link_id") ?? ""));
  if (!link) return { path: null, error: "A link nem található." };
  const file = formData.get("image");
  if (!(file instanceof File)) return { path: null, error: "Nem érkezett kép." };
  const stored = await storeContentImage(LINK_IMAGE_BUCKET, link.id, "cover", new Uint8Array(await file.arrayBuffer()), 600 * 1024, MIGRATION_HINT);
  if (stored.error) return stored;
  const { error } = await createAdminClient().from("links").update({ image_path: stored.path }).eq("id", link.id);
  if (error) return { path: null, error: "A kép mentése nem sikerült, próbáld újra." };
  if (link.image_path) await removeContentImage(LINK_IMAGE_BUCKET, link.image_path);
  revalidatePath("/", "layout");
  return stored;
}

export async function removeLinkImage(formData: FormData): Promise<ContentImageResult> {
  await requireAdmin();
  const link = await getLinkById(String(formData.get("link_id") ?? ""));
  if (!link) return { path: null, error: "A link nem található." };
  if (!link.image_path) return { path: null, error: null };
  const { error } = await createAdminClient().from("links").update({ image_path: null }).eq("id", link.id);
  if (error) return { path: null, error: "A kép törlése nem sikerült, próbáld újra." };
  await removeContentImage(LINK_IMAGE_BUCKET, link.image_path);
  revalidatePath("/", "layout");
  return { path: null, error: null };
}
