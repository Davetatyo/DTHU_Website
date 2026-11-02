// Linkek data from Supabase. Server-only (service-role client; RLS has no policies on links).

import { publicStorageUrl } from "@/lib/storage-url";
import { createAdminClient } from "@/lib/supabase/server";
import { LINK_IMAGE_BUCKET, type LinkRow } from "./links";

export function linkImageUrl(path: string | null | undefined): string | null {
  return publicStorageUrl(LINK_IMAGE_BUCKET, path);
}

/** Every link in page order, hidden ones included (admin). Empty before migration 0006. */
export async function getAllLinks(): Promise<LinkRow[]> {
  const { data, error } = await createAdminClient().from("links").select("*").order("sort_order").order("created_at");
  return error ? [] : ((data ?? []) as LinkRow[]);
}

/** The links the Linkek page shows, in order. */
export async function getVisibleLinks(): Promise<LinkRow[]> {
  return (await getAllLinks()).filter((l) => l.visible);
}

export async function getLinkById(id: string): Promise<LinkRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("links").select("*").eq("id", id).maybeSingle();
  return (data as LinkRow | null) ?? null;
}
