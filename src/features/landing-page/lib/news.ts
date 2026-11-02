// Hírek (news articles): categories, the admin form and the "Frissítve" rule.
// Pure functions only (no database), unit-tested.

import { ALL_BLOCKS, parseBlocks as parseContentBlocks, type ContentBlock } from "@/lib/content-blocks";

/** Storage bucket for news pictures (supabase/migrations/0004_news.sql). */
export const NEWS_IMAGE_BUCKET = "news-images";

export const NEWS_CATEGORIES = ["tournament", "community", "live", "site", "shop"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  tournament: "Bajnokság",
  community: "Közösség",
  live: "Élő esemény",
  site: "Oldal / fejlesztés",
  shop: "Jegyek & Bolt",
};

/** Categories the admin can pick now ("Jegyek & Bolt" comes with those features). */
export const OFFERED_CATEGORIES: NewsCategory[] = ["tournament", "community", "live", "site"];

/** Chip colour per category (design system chip classes). */
export const CATEGORY_CHIP: Record<NewsCategory, string> = { tournament: "info", community: "ok", live: "warn", site: "mut", shop: "warn" };

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === "string" && (NEWS_CATEGORIES as readonly string[]).includes(value);
}

/** One row of public.news. */
export type NewsRow = {
  id: string;
  slug: string;
  title: string;
  category: NewsCategory;
  lead: string | null;
  body: unknown;
  cover_path: string | null;
  pinned: boolean;
  published_at: string | null;
  edited_at: string | null;
  author_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

/** News may use every block type. */
export function parseNewsBlocks(input: unknown, newsId: string): { ok: true; blocks: ContentBlock[] } | { ok: false; error: string } {
  return parseContentBlocks(input, newsId, ALL_BLOCKS);
}

export type NewsFields = { title: string; category: NewsCategory; lead: string | null; pinned: boolean; author_id: string | null };

const UUID = /^[0-9a-f-]{36}$/i;
const str = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max);

/** Checks the admin form. `authors` are the ids that may be picked as author (admins). */
export function parseNewsForm(
  input: Record<string, string | undefined>,
  authors: Set<string>,
): { ok: true; fields: NewsFields } | { ok: false; error: string } {
  const title = str(input.title, 140);
  if (!title) return { ok: false, error: "Add meg a hír címét." };
  if (!isNewsCategory(input.category)) return { ok: false, error: "Válaszd ki a rovatot." };
  const author = str(input.author_id, 40);
  if (author && (!UUID.test(author) || !authors.has(author))) return { ok: false, error: "A szerző csak admin lehet." };
  return {
    ok: true,
    fields: {
      title,
      category: input.category,
      lead: str(input.lead, 400) || null,
      pinned: input.pinned === "on",
      author_id: author || null,
    },
  };
}

/** "Frissítve" shows when the article was saved again well after it went live (10+ minutes). */
export function showEdited(publishedAt: string | null, editedAt: string | null): boolean {
  if (!publishedAt || !editedAt) return false;
  return new Date(editedAt).getTime() - new Date(publishedAt).getTime() > 10 * 60_000;
}
