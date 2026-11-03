// Hírek data from Supabase. Server-only: uses the service-role client, because drafts must
// stay hidden and RLS has no public policy on news (migration 0004).

import { avatarPublicUrl } from "@/lib/avatar-url";
import { publicStorageUrl } from "@/lib/storage-url";
import { createAdminClient } from "@/lib/supabase/server";
import { NEWS_IMAGE_BUCKET, type NewsCategory, type NewsRow } from "./news";

export function newsImageUrl(path: string | null | undefined): string | null {
  return publicStorageUrl(NEWS_IMAGE_BUCKET, path);
}

/** Every article, drafts included (admin list). Empty before migration 0004 is run. */
export async function getAllNews(): Promise<NewsRow[]> {
  const { data, error } = await createAdminClient().from("news").select("*").order("created_at", { ascending: false });
  return error ? [] : ((data ?? []) as NewsRow[]);
}

export async function getNewsById(id: string): Promise<NewsRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("news").select("*").eq("id", id).maybeSingle();
  return (data as NewsRow | null) ?? null;
}

export async function getNewsBySlug(slug: string): Promise<NewsRow | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data } = await createAdminClient().from("news").select("*").eq("slug", slug).maybeSingle();
  return (data as NewsRow | null) ?? null;
}

/** Published articles only (scheduled ones appear by themselves once their time passes). */
function publishedQuery(now = new Date()) {
  return createAdminClient().from("news").select("*", { count: "exact" }).not("published_at", "is", null).lte("published_at", now.toISOString());
}

/** A page of published articles: pinned first, then newest. */
export async function getPublishedNews(opts: { category?: NewsCategory; page?: number; perPage?: number } = {}): Promise<{ rows: NewsRow[]; total: number }> {
  const perPage = opts.perPage ?? 12;
  const page = Math.max(1, opts.page ?? 1);
  let q = publishedQuery();
  if (opts.category) q = q.eq("category", opts.category);
  const { data, error, count } = await q
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  return error ? { rows: [], total: 0 } : { rows: (data ?? []) as NewsRow[], total: count ?? 0 };
}

/** The articles published just before and after this one (for the article page). */
export async function getAdjacentNews(article: NewsRow): Promise<{ newer: NewsRow | null; older: NewsRow | null }> {
  if (!article.published_at) return { newer: null, older: null };
  const [newer, older] = await Promise.all([
    publishedQuery().gt("published_at", article.published_at).order("published_at", { ascending: true }).limit(1),
    publishedQuery().lt("published_at", article.published_at).order("published_at", { ascending: false }).limit(1),
  ]);
  return { newer: ((newer.data ?? [])[0] as NewsRow) ?? null, older: ((older.data ?? [])[0] as NewsRow) ?? null };
}

/** Published articles that show this event as a card ("Kapcsolódó hírek" on the event page). */
export async function getNewsAboutEvent(eventId: string): Promise<NewsRow[]> {
  const { data, error } = await publishedQuery()
    .contains("body", [{ t: "event", id: eventId }])
    .order("published_at", { ascending: false })
    .limit(6);
  return error ? [] : ((data ?? []) as NewsRow[]);
}

export type NewsAuthor = { id: string; name: string; avatar: string | null };

/** Admins, who can be picked as authors. */
export async function getAuthorOptions(): Promise<NewsAuthor[]> {
  const { data } = await createAdminClient().from("profiles").select("*").eq("is_admin", true).order("display_name");
  return (data ?? []).map((p) => ({
    id: p.id as string,
    name: (p.display_name || p.discord_username || "Admin") as string,
    avatar: avatarPublicUrl(p.avatar_path as string | null),
  }));
}

/** Author name and picture by profile id. */
export async function getAuthors(ids: (string | null)[]): Promise<Map<string, NewsAuthor>> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  const map = new Map<string, NewsAuthor>();
  if (!wanted.length) return map;
  const { data } = await createAdminClient().from("profiles").select("*").in("id", wanted);
  for (const p of data ?? []) {
    map.set(p.id as string, {
      id: p.id as string,
      name: (p.display_name || p.discord_username || "DTHU") as string,
      avatar: avatarPublicUrl(p.avatar_path as string | null),
    });
  }
  return map;
}
