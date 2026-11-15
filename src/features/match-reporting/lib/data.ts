// Reads for the Játszmák pages, server only (service-role client; pages check access and
// gameRights first). Every read copes with migration 0014 not having run yet: it returns nothing.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import type { Game } from "./types";

export type GamePlayer = { id: string; name: string; avatar_path: string | null };
export type GameView = Game & { a: GamePlayer; b: GamePlayer; tournament: { name: string; slug: string | null } | null };
export type GameEvent = { id: number; kind: string; actor_id: string | null; reason: string | null; created_at: string };

const PROFILE_COLS = "id, karnyx_name, display_name, avatar_path";
const SELECT =
  `*, pa:profiles!games_profile_a_fkey(${PROFILE_COLS}), pb:profiles!games_profile_b_fkey(${PROFILE_COLS}), ` +
  "tournament:tournaments(name, slug)";

type ProfileRow = { id: string; karnyx_name: string | null; display_name: string | null; avatar_path: string | null } | null;
type Row = Game & { pa: ProfileRow; pb: ProfileRow; tournament: { name: string; slug: string | null } | null };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

function player(p: ProfileRow, id: string): GamePlayer {
  return { id, name: p?.karnyx_name ?? p?.display_name ?? "?", avatar_path: p?.avatar_path ?? null };
}

function toView(r: Row): GameView {
  const { pa, pb, ...game } = r;
  return { ...game, a: player(pa, r.profile_a), b: player(pb, r.profile_b) };
}

export async function getGame(id: string): Promise<GameView | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await createAdminClient().from("games").select(SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toView(data as unknown as Row);
}

/** The viewer's games (any status, any context), newest report first. */
export async function getMyGames(profileId: string, limit = 100): Promise<GameView[]> {
  if (!isUuid(profileId)) return [];
  const { data, error } = await createAdminClient()
    .from("games")
    .select(SELECT)
    .or(`profile_a.eq.${profileId},profile_b.eq.${profileId}`)
    .order("reported_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Row[]).map(toView);
}

/** How many pending games wait for this player's answer (the tab badge). One query per request. */
export const countAwaiting = cache(async (profileId: string): Promise<number> => {
  if (!isUuid(profileId)) return 0;
  const { count, error } = await createAdminClient()
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .or(`and(reported_side.eq.a,profile_b.eq.${profileId}),and(reported_side.eq.b,profile_a.eq.${profileId})`);
  return error ? 0 : count ?? 0;
});

export async function getGameEvents(gameId: string): Promise<GameEvent[]> {
  const { data, error } = await createAdminClient()
    .from("game_events")
    .select("id, kind, actor_id, reason, created_at")
    .eq("game_id", gameId)
    .order("id");
  return error ? [] : ((data ?? []) as GameEvent[]);
}

/** Players who can be picked as an opponent: has a Karnyx name, not banned, not the viewer. */
export async function getOpponents(viewerId: string): Promise<GamePlayer[]> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select(PROFILE_COLS)
    .not("karnyx_name", "is", null)
    .is("banned_at", null)
    .neq("id", viewerId)
    .order("karnyx_name");
  return ((data ?? []) as NonNullable<ProfileRow>[]).map((p) => player(p, p.id));
}

export type OpenFixture = { href: string; tournament: string };

/**
 * The viewer's unplayed Bajnokságok matches, by opponent profile: the report form warns when a
 * casual / ranked game is reported against someone the viewer still has to play there.
 */
export async function getOpenFixtures(viewerId: string): Promise<Record<string, OpenFixture>> {
  const out: Record<string, OpenFixture> = {};
  const db = createAdminClient();
  const { data: mine, error } = await db
    .from("players")
    .select("id, tournament:tournaments!inner(name, status, format)")
    .eq("profile_id", viewerId)
    .eq("tournament.status", "running")
    .neq("tournament.format", "manual");
  if (error || !mine?.length) return out;
  const ids = mine.map((p) => p.id as string);
  const list = ids.join(",");
  const { data: matches } = await db
    .from("matches")
    .select("id, player_a_id, player_b_id, status, winner_id, is_draw, a:players!matches_player_a_fkey(profile_id), b:players!matches_player_b_fkey(profile_id)")
    .or(`player_a_id.in.(${list}),player_b_id.in.(${list})`)
    .not("player_b_id", "is", null)
    .neq("status", "played");
  const nameOf = new Map(mine.map((p) => [p.id as string, (p.tournament as unknown as { name: string }).name]));
  type M = { id: string; player_a_id: string; player_b_id: string; winner_id: string | null; is_draw: boolean; a: { profile_id: string | null } | null; b: { profile_id: string | null } | null };
  for (const m of (matches ?? []) as unknown as M[]) {
    if (m.winner_id || m.is_draw) continue;
    const meA = ids.includes(m.player_a_id);
    const opponent = meA ? m.b?.profile_id : m.a?.profile_id;
    if (opponent) out[opponent] = { href: routes.match(m.id), tournament: nameOf.get(meA ? m.player_a_id : m.player_b_id) ?? "" };
  }
  return out;
}
