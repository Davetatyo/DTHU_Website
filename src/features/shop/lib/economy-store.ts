// Loads and saves the economy settings (economy_config, migration 0010). Server only.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { CONFIG_KEYS, DEFAULT_ECONOMY, economyFromRows, type Economy } from "./economy";

/**
 * The current settings, read once per request. Before migration 0010 runs (no table yet) or if
 * the read fails, the defaults apply, so the Bolt and the games keep working.
 */
export const loadEconomy = cache(async (): Promise<Economy> => {
  const { data, error } = await createAdminClient().from("economy_config").select("key, value");
  if (error) return DEFAULT_ECONOMY;
  return economyFromRows((data ?? []) as { key: string; value: unknown }[]);
});

/** Whether the settings table exists (migration 0010 applied). */
export async function economyReady(): Promise<boolean> {
  const { error } = await createAdminClient().from("economy_config").select("key").limit(1);
  return !error;
}

/**
 * Saves the fields that changed. Each change is written together with its audit-log entry
 * (database function economy_config_set). Returns the keys that changed.
 */
export async function saveEconomy(next: Economy, by: string, reason: string): Promise<string[]> {
  const current = await loadEconomyFresh();
  const db = createAdminClient();
  const changed: string[] = [];
  for (const field of Object.keys(CONFIG_KEYS) as (keyof Economy)[]) {
    if (JSON.stringify(current[field]) === JSON.stringify(next[field])) continue;
    const { error } = await db.rpc("economy_config_set", {
      p_key: CONFIG_KEYS[field],
      p_value: next[field],
      p_by: by,
      p_reason: reason || null,
    });
    if (error) throw new Error(error.message);
    changed.push(CONFIG_KEYS[field]);
  }
  return changed;
}

async function loadEconomyFresh(): Promise<Economy> {
  const { data, error } = await createAdminClient().from("economy_config").select("key, value");
  if (error) throw new Error(error.message);
  return economyFromRows((data ?? []) as { key: string; value: unknown }[]);
}
