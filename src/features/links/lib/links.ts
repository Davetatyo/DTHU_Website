// Linkek: the admin form and ordering. Pure functions only (no database), unit-tested.

import { safeUrl } from "@/lib/publishing";

/** Storage bucket for link pictures (supabase/migrations/0006_links.sql). */
export const LINK_IMAGE_BUCKET = "link-images";

/** One row of public.links. */
export type LinkRow = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  visible: boolean;
};

export type LinkFields = { title: string; url: string; description: string | null; visible: boolean };

const str = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max);

/** Checks the admin form: a title and an http(s) address are needed. */
export function parseLinkForm(input: Record<string, string | undefined>): { ok: true; fields: LinkFields } | { ok: false; error: string } {
  const title = str(input.title, 80);
  if (!title) return { ok: false, error: "Add meg a link nevét." };
  const url = safeUrl(str(input.url, 500));
  if (!url) return { ok: false, error: "A cím http:// vagy https:// kezdetű legyen." };
  return { ok: true, fields: { title, url, description: str(input.description, 160) || null, visible: input.visible === "on" } };
}

/**
 * New sort_order values after moving one link up or down: the list is renumbered 10, 20, 30 …
 * so gaps or equal numbers never get in the way. Returns only the links whose number changed.
 */
export function reorder(links: Pick<LinkRow, "id" | "sort_order">[], id: string, dir: -1 | 1): { id: string; sort_order: number }[] {
  const list = [...links].sort((a, b) => a.sort_order - b.sort_order);
  const i = list.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return [];
  [list[i], list[j]] = [list[j], list[i]];
  return list.map((l, k) => ({ id: l.id, sort_order: (k + 1) * 10 })).filter((n) => links.find((l) => l.id === n.id)!.sort_order !== n.sort_order);
}

/** sort_order for a new link: after the last one. */
export function nextSortOrder(links: Pick<LinkRow, "sort_order">[]): number {
  return links.reduce((m, l) => Math.max(m, l.sort_order), 0) + 10;
}
