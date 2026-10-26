import { sameName } from "./auth";
import { createAdminClient } from "./supabase/server";
import type { MatchView, Player, Profile, Proposal, Round, Tournament } from "./types";

// Reads run server-side with the service client. Pages decide what to show to whom:
// Facebook/Discord names are only rendered for signed-in visitors.

const MATCH_SELECT =
  "*, a:players!matches_player_a_fkey(*), b:players!matches_player_b_fkey(*), round:rounds!inner(*)";

export async function getActiveTournament(): Promise<Tournament | null> {
  const { data } = await createAdminClient()
    .from("tournaments")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Tournament | null;
}

export async function getRounds(tournamentId: string): Promise<Round[]> {
  const { data } = await createAdminClient()
    .from("rounds")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("number", { ascending: false });
  return (data ?? []) as Round[];
}

export async function getLatestRound(tournamentId: string): Promise<Round | null> {
  return (await getRounds(tournamentId))[0] ?? null;
}

export async function getRoundMatches(roundId: string): Promise<MatchView[]> {
  const { data } = await createAdminClient()
    .from("matches")
    .select(MATCH_SELECT)
    .eq("round_id", roundId)
    .order("table_no");
  return (data ?? []) as MatchView[];
}

export async function getMatch(id: string): Promise<MatchView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("matches").select(MATCH_SELECT).eq("id", id).maybeSingle();
  return data as MatchView | null;
}

export async function getProposals(matchId: string): Promise<Proposal[]> {
  const { data } = await createAdminClient()
    .from("proposals")
    .select("*")
    .eq("match_id", matchId)
    .order("starts_at");
  return (data ?? []) as Proposal[];
}

/** Scheduled matches of a tournament, optionally only from `from` onwards. */
export async function getScheduledMatches(tournamentId: string, from?: Date): Promise<MatchView[]> {
  let query = createAdminClient()
    .from("matches")
    .select(MATCH_SELECT)
    .eq("round.tournament_id", tournamentId)
    .not("scheduled_at", "is", null)
    .order("scheduled_at");
  if (from) query = query.gte("scheduled_at", from.toISOString());
  const { data } = await query;
  return (data ?? []) as MatchView[];
}

export async function getPlayers(tournamentId: string): Promise<Player[]> {
  const { data } = await createAdminClient()
    .from("players")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("karnyx_name");
  return (data ?? []) as Player[];
}

/** Profiles keyed by lower-cased Karnyx name. */
export async function getProfilesByKarnyx(names: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  if (names.length === 0) return map;
  const { data } = await createAdminClient().from("profiles").select("*").not("karnyx_name", "is", null);
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  for (const p of (data ?? []) as Profile[]) {
    const key = p.karnyx_name!.toLowerCase();
    if (wanted.has(key)) map.set(key, p);
  }
  return map;
}

export function profileFor(map: Map<string, Profile>, player: Player | null): Profile | null {
  return player ? map.get(player.karnyx_name.toLowerCase()) ?? null : null;
}

export function isParticipant(match: MatchView, karnyxName: string | null): boolean {
  return sameName(match.a.karnyx_name, karnyxName) || sameName(match.b?.karnyx_name, karnyxName);
}

/** The viewer's match in the latest round of the active tournament. */
export async function getMyLatestMatch(profile: Profile): Promise<MatchView | null> {
  if (!profile.karnyx_name) return null;
  const tournament = await getActiveTournament();
  if (!tournament) return null;
  const round = await getLatestRound(tournament.id);
  if (!round) return null;
  const matches = await getRoundMatches(round.id);
  return matches.find((m) => isParticipant(m, profile.karnyx_name)) ?? null;
}
