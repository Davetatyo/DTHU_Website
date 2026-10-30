import { getActiveTournament, getPlayers } from "@/features/match-organizer/lib/data";
import { sampleRanking, type RankRow } from "./ranking";

/** The (sample) ranking of the active tournament's roster. */
export async function loadRanking(): Promise<RankRow[]> {
  const tournament = await getActiveTournament();
  return tournament ? sampleRanking(await getPlayers(tournament.id)) : [];
}

export const rowOf = (rows: RankRow[], name: string | null | undefined) =>
  name ? rows.find((r) => r.p.toLowerCase() === name.toLowerCase()) : undefined;
