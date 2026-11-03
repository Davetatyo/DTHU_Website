"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { imagePathsInUse, pollsIn, type ContentImageResult } from "@/lib/content-blocks";
import { deleteUnusedContentImages, removeContentImage, storeContentImage } from "@/lib/content-images";
import { nextPublishedAt, parsePublishIntent, PUBLISH_LABELS, publishState, slugify, uniqueSlug } from "@/lib/publishing";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import { NEWS_IMAGE_BUCKET, parseNewsBlocks, parseNewsForm } from "@/features/landing-page/lib/news";
import { getAuthorOptions, getNewsById } from "@/features/landing-page/lib/news-data";
import { checkPollSetups, syncPolls } from "@/features/landing-page/lib/polls-data";

const MIGRATION_HINT = "Lefuttattad a 0004-es adatbázis-frissítést?";
const MAX_COVER_BYTES = 600 * 1024;
const MAX_BLOCK_IMAGE_BYTES = 900 * 1024;

function formInput(formData: FormData): Record<string, string> {
  const input: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") input[key] = value;
  return input;
}

function go(url: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath("/", "layout");
  redirect(`${url}?${key}=${encodeURIComponent(text)}`);
}

async function authorIds(): Promise<Set<string>> {
  return new Set((await getAuthorOptions()).map((a) => a.id));
}

/** "Új hír": saves a draft (author: the admin, unless picked) and opens it for editing. */
export async function createNews(formData: FormData) {
  const me = await requireAdmin();
  const parsed = parseNewsForm(formInput(formData), await authorIds());
  if (!parsed.ok) go(routes.adminNewsNew, "hiba", parsed.error);

  const db = createAdminClient();
  const base = slugify(parsed.fields.title, "hir");
  const { data: similar } = await db.from("news").select("slug").like("slug", `${base}%`);
  const slug = uniqueSlug(base, new Set((similar ?? []).map((r) => r.slug as string)));

  const { data, error } = await db
    .from("news")
    .insert({ ...parsed.fields, author_id: parsed.fields.author_id ?? me.id, slug, created_by: me.id, updated_by: me.id })
    .select("id")
    .single();
  if (error || !data) go(routes.adminNewsNew, "hiba", `A hír mentése nem sikerült. ${MIGRATION_HINT}`);
  go(routes.adminNewsItem(data.id), "uzenet", "Piszkozat elmentve. Add hozzá a képet és a tartalmat, majd tedd közzé.");
}

/** Saves the edit form; the pressed button decides publishing (save / now / scheduled / back to draft). */
export async function saveNews(formData: FormData) {
  const me = await requireAdmin();
  const article = await getNewsById(String(formData.get("news_id") ?? ""));
  if (!article) go(routes.adminNews, "hiba", "A hír nem található.");
  const url = routes.adminNewsItem(article.id);

  const input = formInput(formData);
  const parsed = parseNewsForm(input, await authorIds());
  if (!parsed.ok) go(url, "hiba", parsed.error);
  const blocks = parseNewsBlocks(input.body ?? "[]", article.id);
  if (!blocks.ok) go(url, "hiba", blocks.error);
  const intent = parsePublishIntent(input.intent, input.publish_at, me.timezone);
  if (!intent.ok) go(url, "hiba", intent.error);
  const polls = pollsIn(blocks.blocks).setups;
  const pollError = await checkPollSetups(article.id, polls);
  if (pollError) go(url, "hiba", pollError);

  const now = new Date();
  const wasLive = publishState(article.published_at, now) === "live";
  const publishedAt = nextPublishedAt(article.published_at, intent.intent, now);
  // "Frissítve": a plain save of an article that is already out.
  const editedAt = intent.intent.kind === "save" && wasLive ? now.toISOString() : intent.intent.kind === "unpublish" ? null : article.edited_at;

  const { error } = await createAdminClient()
    .from("news")
    .update({ ...parsed.fields, body: blocks.blocks, published_at: publishedAt, edited_at: editedAt, updated_by: me.id, updated_at: now.toISOString() })
    .eq("id", article.id);
  if (error) go(url, "hiba", "A mentés nem sikerült, próbáld újra.");
  const syncError = await syncPolls(article.id, polls, me.id);
  if (syncError) go(url, "hiba", syncError);

  await deleteUnusedContentImages(NEWS_IMAGE_BUCKET, article.id, imagePathsInUse(article.cover_path, blocks.blocks));

  const state = publishState(publishedAt, now);
  const message =
    intent.intent.kind === "publish_now"
      ? "Közzétéve: a hír most már látszik a Hírek között."
      : intent.intent.kind === "schedule"
        ? `Időzítve: ${formatDateTime(publishedAt ?? "", me.timezone)}-kor jelenik meg magától.`
        : intent.intent.kind === "unpublish"
          ? "Visszavonva: a hír újra piszkozat, nem látszik az oldalon."
          : `Elmentve (${PUBLISH_LABELS[state].toLowerCase()}).`;
  go(url, "uzenet", message);
}

/** Deletes an article and all its pictures (its polls and their votes go with it). */
export async function deleteNews(formData: FormData) {
  await requireAdmin();
  const article = await getNewsById(String(formData.get("news_id") ?? ""));
  if (!article) go(routes.adminNews, "hiba", "A hír nem található.");
  const { error } = await createAdminClient().from("news").delete().eq("id", article.id);
  if (error) go(routes.adminNewsItem(article.id), "hiba", "A törlés nem sikerült, próbáld újra.");
  await deleteUnusedContentImages(NEWS_IMAGE_BUCKET, article.id, new Set());
  go(routes.adminNews, "uzenet", `„${article.title}” törölve.`);
}

/**
 * Uploads a picture (already shrunk in the browser). The card picture ("cover") is saved on
 * the article right away; content pictures are kept once the form is saved.
 */
export async function uploadNewsImage(formData: FormData): Promise<ContentImageResult> {
  await requireAdmin();
  const article = await getNewsById(String(formData.get("news_id") ?? ""));
  if (!article) return { path: null, error: "A hír nem található." };
  const role = formData.get("role") === "cover" ? "cover" : "block";
  const file = formData.get("image");
  if (!(file instanceof File)) return { path: null, error: "Nem érkezett kép." };

  const stored = await storeContentImage(
    NEWS_IMAGE_BUCKET,
    article.id,
    role,
    new Uint8Array(await file.arrayBuffer()),
    role === "cover" ? MAX_COVER_BYTES : MAX_BLOCK_IMAGE_BYTES,
    MIGRATION_HINT,
  );
  if (stored.error) return stored;
  if (role === "cover") {
    const { error } = await createAdminClient().from("news").update({ cover_path: stored.path }).eq("id", article.id);
    if (error) return { path: null, error: "A kép mentése nem sikerült, próbáld újra." };
    if (article.cover_path) await removeContentImage(NEWS_IMAGE_BUCKET, article.cover_path);
    revalidatePath("/", "layout");
  }
  return stored;
}

/** Removes the card picture. */
export async function removeNewsCover(formData: FormData): Promise<ContentImageResult> {
  await requireAdmin();
  const article = await getNewsById(String(formData.get("news_id") ?? ""));
  if (!article) return { path: null, error: "A hír nem található." };
  if (!article.cover_path) return { path: null, error: null };
  const { error } = await createAdminClient().from("news").update({ cover_path: null }).eq("id", article.id);
  if (error) return { path: null, error: "A kép törlése nem sikerült, próbáld újra." };
  await removeContentImage(NEWS_IMAGE_BUCKET, article.cover_path);
  revalidatePath("/", "layout");
  return { path: null, error: null };
}
