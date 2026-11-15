import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { PlayerStatsView } from "@/features/player-stats/components/PlayerStatsView";
import { canSeePlayerStats, statContexts } from "@/features/player-stats/lib/access";
import { getPlayerGames, getStatsProfile } from "@/features/player-stats/lib/data";
import { computeStats, countByKind, filterByKind, parseStatKind } from "@/features/player-stats/lib/stats";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const player = await getStatsProfile(id);
  return { title: player ? `${player.karnyx_name} statisztikája` : "Játékos" };
}

export default async function PlayerStatsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipus?: string }> }) {
  const viewer = await requireProfile();
  if (!(await canSeePlayerStats())) redirect(routes.organizer);
  const [{ id }, { tipus }, contexts] = await Promise.all([params, searchParams, statContexts()]);
  const player = await getStatsProfile(id);
  if (!player) notFound();
  const games = await getPlayerGames(player.id, contexts);
  // Championships only until casual / ranked games count for this viewer: then the filter shows.
  const withFilter = contexts.length > 1;
  const kind = withFilter ? parseStatKind(tipus) : "tournament";
  const filter = withFilter ? { kind, counts: countByKind(games), basePath: routes.player(player.id) } : null;

  return (
    <div className="mx-auto max-w-5xl">
      <PlayerStatsView profile={player} stats={computeStats(filterByKind(games, kind))} timeZone={viewer.timezone} isOwn={player.id === viewer.id} filter={filter} />
    </div>
  );
}
