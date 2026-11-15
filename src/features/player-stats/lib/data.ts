// Reads for player stats, server only (service-role client: callers check canSeePlayerStats).
// Every read copes with migration 0014 not having run yet (missing table): it returns nothing.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { statGameFromRow, type GameStatRow, type StatGame } from "./stats";

/** A game plus the opponent's profile (for a link to their stats), when known. */
export type ProfileGame = StatGame & { opponentProfileId: string | null };

export type StatsProfile = { id: string; karnyx_name: string; avatar_path: string | null };

const GAME_SELECT =
  "id, match_id, profile_a, profile_b, hero_a, hero_b, hp_a, hp_b, ban_a, ban_b, outcome, played_at, confirmed_at, " +
  "tournament:tournaments(id, name), " +
  "match:matches(round:rounds(number), a:players!matches_player_a_fkey(karnyx_name), b:players!matches_player_b_fkey(karnyx_name)), " +
  "pa:profiles!games_profile_a_fkey(karnyx_name), pb:profiles!games_profile_b_fkey(karnyx_name)";

const PAGE = 1000;

/**
 * Finished championship games by profile id, from the games table (migration 0014). Games carry
 * profile ids, so they stay with the profile even if the player changes their Karnyx name.
 * Pass a profile id to load only that player's games.
 */
async function loadGames(onlyProfileId?: string): Promise<Map<string, ProfileGame[]>> {
  const byProfile = new Map<string, ProfileGame[]>();
  // The id goes into a filter string: only a real uuid.
  if (onlyProfileId && !/^[0-9a-f-]{36}$/i.test(onlyProfileId)) return byProfile;
  const db = createAdminClient();

  const rows: GameStatRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = db.from("games").select(GAME_SELECT).eq("context", "tournament").eq("status", "finalized");
    if (onlyProfileId) query = query.or(`profile_a.eq.${onlyProfileId},profile_b.eq.${onlyProfileId}`);
    const { data, error } = await query.order("id").range(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...(data as unknown as GameStatRow[]));
    if (data.length < PAGE) break;
  }

  for (const row of rows) {
    for (const [me, opponent] of [
      [row.profile_a, row.profile_b],
      [row.profile_b, row.profile_a],
    ] as const) {
      if (onlyProfileId && me !== onlyProfileId) continue;
      const game = statGameFromRow(row, me);
      if (!game) continue;
      const list = byProfile.get(me) ?? [];
      list.push({ ...game, opponentProfileId: opponent });
      byProfile.set(me, list);
    }
  }
  return byProfile;
}

/** One player's finished championship games. */
export async function getPlayerGames(profileId: string): Promise<ProfileGame[]> {
  return (await loadGames(profileId)).get(profileId) ?? [];
}

/** Every player's games, for the players list. */
export async function getAllPlayerGames(): Promise<Map<string, ProfileGame[]>> {
  return loadGames();
}

/** A player whose stats page can be shown: has a Karnyx name and isn't banned. */
export async function getStatsProfile(id: string): Promise<StatsProfile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, karnyx_name, avatar_path")
    .eq("id", id)
    .not("karnyx_name", "is", null)
    .is("banned_at", null)
    .maybeSingle();
  return (data as StatsProfile | null) ?? null;
}

/** Every player who can have a stats page, by name. */
export async function getStatsProfiles(): Promise<StatsProfile[]> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, karnyx_name, avatar_path")
    .not("karnyx_name", "is", null)
    .is("banned_at", null)
    .order("karnyx_name");
  return (data ?? []) as StatsProfile[];
}

/**
 * Profile ids by lower-cased Karnyx name, so a name anywhere on the site can link to its stats
 * page (same lookup as the avatars). One query per request.
 */
export const getProfileIdsByKarnyx = cache(async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  for (const p of await getStatsProfiles()) map.set(p.karnyx_name.toLowerCase(), p.id);
  return map;
});
