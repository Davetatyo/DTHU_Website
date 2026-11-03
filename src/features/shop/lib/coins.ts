// Read helpers for DTHU coins (service client; callers decide what to show).

import { isMissingTable } from "@/features/tickets/lib/errors";
import { createAdminClient } from "@/lib/supabase/server";

export type CoinLedgerRow = {
  id: string;
  profile_id: string;
  amount: number;
  kind: "award" | "shop_purchase";
  reason: string;
  created_by: string | null;
  created_at: string;
};

/** Thrown when migration 0009 is not applied yet; pages catch it and show a notice. */
export class CoinsNotReady extends Error {}

function check<T>(res: { data: T | null; error: { code?: string; message?: string } | null }): T {
  if (res.error) {
    if (isMissingTable(res.error)) throw new CoinsNotReady();
    throw new Error(res.error.message);
  }
  return res.data as T;
}

export async function getCoinBalance(profileId: string): Promise<number> {
  const rows = check(await createAdminClient().from("coin_ledger").select("amount").eq("profile_id", profileId));
  return (rows as { amount: number }[]).reduce((n, r) => n + r.amount, 0);
}

export async function getCoinLedger(profileId: string | null, limit = 50): Promise<CoinLedgerRow[]> {
  let q = createAdminClient().from("coin_ledger").select("*").order("created_at", { ascending: false }).limit(limit);
  if (profileId) q = q.eq("profile_id", profileId);
  return check(await q) as CoinLedgerRow[];
}

/** Coin balance of every player who ever had coins (the community is small: summed here). */
export async function getAllCoinBalances(): Promise<Map<string, number>> {
  const rows = check(await createAdminClient().from("coin_ledger").select("profile_id, amount")) as {
    profile_id: string;
    amount: number;
  }[];
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.profile_id, (map.get(r.profile_id) ?? 0) + r.amount);
  return map;
}
