// Read helpers for the Sorsolás feature (service client; callers decide what to show).

import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { isMissingTable } from "./errors";
import type { Draw, DrawEntryRow, LedgerRow, WinnerRow } from "./types";

/** Name shown for a profile: Karnyx name, else Discord display name, else username. */
export function profileName(p: Pick<Profile, "karnyx_name" | "display_name" | "discord_username"> | null | undefined): string {
  return p?.karnyx_name ?? p?.display_name ?? p?.discord_username ?? "Ismeretlen";
}

/** Thrown when migration 0008 is not applied yet; pages catch it and show a notice. */
export class TicketsNotReady extends Error {}

function check<T>(res: { data: T | null; error: { code?: string; message?: string } | null }): T {
  if (res.error) {
    if (isMissingTable(res.error)) throw new TicketsNotReady();
    throw new Error(res.error.message);
  }
  return res.data as T;
}

export async function getBalance(profileId: string): Promise<number> {
  const rows = check(await createAdminClient().from("ticket_ledger").select("amount").eq("profile_id", profileId));
  return (rows as { amount: number }[]).reduce((n, r) => n + r.amount, 0);
}

export async function getLedger(profileId: string | null, limit = 50): Promise<LedgerRow[]> {
  let q = createAdminClient().from("ticket_ledger").select("*").order("created_at", { ascending: false }).limit(limit);
  if (profileId) q = q.eq("profile_id", profileId);
  return check(await q) as LedgerRow[];
}

/** Balance of every player who ever had a ticket (the community is small: summed here). */
export async function getAllBalances(): Promise<Map<string, number>> {
  const rows = check(await createAdminClient().from("ticket_ledger").select("profile_id, amount")) as {
    profile_id: string;
    amount: number;
  }[];
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.profile_id, (map.get(r.profile_id) ?? 0) + r.amount);
  return map;
}

export async function getDraws(): Promise<Draw[]> {
  return check(await createAdminClient().from("ticket_draws").select("*").order("closes_at", { ascending: false })) as Draw[];
}

export async function getDrawEntries(drawIds: string[]): Promise<DrawEntryRow[]> {
  if (drawIds.length === 0) return [];
  return check(await createAdminClient().from("ticket_draw_entries").select("*").in("draw_id", drawIds)) as DrawEntryRow[];
}

export async function getDrawWinners(drawIds: string[]): Promise<WinnerRow[]> {
  if (drawIds.length === 0) return [];
  return check(
    await createAdminClient().from("ticket_draw_winners").select("*").in("draw_id", drawIds).order("place"),
  ) as WinnerRow[];
}

export async function getProfilesById(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await createAdminClient().from("profiles").select("*").in("id", unique);
  return new Map(((data ?? []) as Profile[]).map((p) => [p.id, p]));
}
