// Reads for player stats, server only (service-role client: callers check canSeePlayerStats).
// Every read copes with migration 0013 not having run yet (missing tables): it returns nothing.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { toStatGame, type StatGame, type StatMatchInput, type StatReportInput } from "./stats";

/** A game plus the opponent's profile (for a link to their stats), when known. */
export type ProfileGame = StatGame & { opponentProfileId: string | null };

export type StatsProfile = { id: string; karnyx_name: string; avatar_path: string | null };

const key = (tournamentId: string, name: string) => `${tournamentId}|${name.toLowerCase()}`;

/** Supabase turns long `in` lists into long URLs: query in slices. */
async function inChunks<T>(ids: string[], run: (slice: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 150) out.push(...(await run(ids.slice(i, i + 150))));
  return out;
}

/**
 * Finished championship games by profile id. A profile's games are found through its
 * registrations (profile → tournament + Karnyx name at sign-up → that tournament's players row),
 * so they stay with the profile even if the player later changes their Karnyx name.
 * Pass a profile id to load only that player's games (the opponents are still resolved).
 */
async function loadGames(onlyProfileId?: string): Promise<Map<string, ProfileGame[]>> {
  const byProfile = new Map<string, ProfileGame[]>();
  const db = createAdminClient();

  let tournamentIds: string[];
  if (onlyProfileId) {
    const { data, error } = await db.from("tournament_registrations").select("tournament_id").eq("profile_id", onlyProfileId);
    if (error || !data?.length) return byProfile;
    tournamentIds = [...new Set(data.map((r) => r.tournament_id as string))];
  } else {
    const { data, error } = await db.from("tournament_registrations").select("tournament_id");
    if (error || !data?.length) return byProfile;
    tournamentIds = [...new Set(data.map((r) => r.tournament_id as string))];
  }

  // Every registration of those tournaments: opponents need their profile too.
  const regs = await inChunks(tournamentIds, async (slice) => {
    const { data } = await db.from("tournament_registrations").select("tournament_id, profile_id, karnyx_name").in("tournament_id", slice);
    return (data ?? []) as { tournament_id: string; profile_id: string; karnyx_name: string }[];
  });
  const profileByKey = new Map(regs.map((r) => [key(r.tournament_id, r.karnyx_name), r.profile_id]));

  const players = await inChunks(tournamentIds, async (slice) => {
    const { data } = await db.from("players").select("id, tournament_id, karnyx_name").in("tournament_id", slice);
    return (data ?? []) as { id: string; tournament_id: string; karnyx_name: string }[];
  });
  const profileByPlayer = new Map<string, string>();
  for (const p of players) {
    const profileId = profileByKey.get(key(p.tournament_id, p.karnyx_name));
    if (profileId) profileByPlayer.set(p.id, profileId);
  }

  const matches = await inChunks(tournamentIds, async (slice) => {
    const { data } = await db
      .from("matches")
      .select(
        "id, player_a_id, player_b_id, played_at, a:players!matches_player_a_fkey(karnyx_name), b:players!matches_player_b_fkey(karnyx_name), round:rounds!inner(number, tournament_id, tournament:tournaments(id, name))",
      )
      .in("round.tournament_id", slice)
      .not("player_b_id", "is", null);
    return (data ?? []) as unknown as StatMatchInput[];
  });

  const reports = await inChunks(
    matches.map((m) => m.id),
    async (slice) => {
      const { data } = await db
        .from("match_reports")
        .select("match_id, outcome, hp_a, hp_b, pick_a, pick_b, ban_a, ban_b, confirmed_at")
        .in("match_id", slice)
        .not("confirmed_at", "is", null);
      return (data ?? []) as (StatReportInput & { match_id: string })[];
    },
  );
  const reportByMatch = new Map(reports.map((r) => [r.match_id, r]));

  for (const m of matches) {
    const report = reportByMatch.get(m.id);
    if (!report) continue;
    for (const [mine, theirs] of [
      [m.player_a_id, m.player_b_id],
      [m.player_b_id, m.player_a_id],
    ] as const) {
      const profileId = mine ? profileByPlayer.get(mine) : undefined;
      if (!mine || !profileId || (onlyProfileId && profileId !== onlyProfileId)) continue;
      const game = toStatGame(m, report, new Set([mine]));
      if (!game) continue;
      const list = byProfile.get(profileId) ?? [];
      list.push({ ...game, opponentProfileId: (theirs && profileByPlayer.get(theirs)) || null });
      byProfile.set(profileId, list);
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
