import Link from "next/link";
import { routes } from "@/lib/routes";
import { canSeePlayerStats } from "../lib/access";
import { getPlayerGames } from "../lib/data";
import { computeStats, formatWinRate, recordLabel } from "../lib/stats";
import "../player-stats.css";

/** Profilom: a short summary of the player's own stats with a link to the full page. */
export async function ProfileStatsCard({ profileId, hasKarnyxName }: { profileId: string; hasKarnyxName: boolean }) {
  if (!hasKarnyxName || !(await canSeePlayerStats())) return null;
  const s = computeStats(await getPlayerGames(profileId));
  return (
    <section className="ps-card mb-4">
      <h2>Statisztikám</h2>
      <p className="ps-note">
        {s.total.games === 0
          ? "Még nincs lezárt bajnoki meccsed. Az első megerősített eredmény után itt látod a győzelmi arányodat és a hőseidet."
          : `${s.total.games} meccs · ${recordLabel(s.total)} · győzelmi arány ${formatWinRate(s.total.winRate)}${s.heroes[0] ? ` · kedvenc hős: ${s.heroes[0].hero}` : ""}`}
      </p>
      <p className="ps-note">
        <Link className="link" href={routes.player(profileId)}>
          Teljes statisztika
        </Link>
        {" · "}A statisztikádat minden bejelentkezett játékos láthatja.
      </p>
    </section>
  );
}
