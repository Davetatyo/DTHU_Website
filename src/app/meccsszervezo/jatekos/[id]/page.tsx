import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { PlayerStatsView } from "@/features/player-stats/components/PlayerStatsView";
import { canSeePlayerStats } from "@/features/player-stats/lib/access";
import { getPlayerGames, getStatsProfile } from "@/features/player-stats/lib/data";
import { computeStats } from "@/features/player-stats/lib/stats";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const player = await getStatsProfile(id);
  return { title: player ? `${player.karnyx_name} statisztikája` : "Játékos" };
}

export default async function PlayerStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireProfile();
  if (!(await canSeePlayerStats())) redirect(routes.organizer);
  const { id } = await params;
  const player = await getStatsProfile(id);
  if (!player) notFound();
  const games = await getPlayerGames(player.id);

  return (
    <div className="mx-auto max-w-5xl">
      <PlayerStatsView profile={player} stats={computeStats(games)} timeZone={viewer.timezone} isOwn={player.id === viewer.id} />
    </div>
  );
}
