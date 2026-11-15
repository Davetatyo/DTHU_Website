import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeroAvatar } from "@/components/HeroAvatar";
import { InfoTip } from "@/components/InfoTip";
import { requireProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { avatarPublicUrl } from "@/features/profile/lib/avatar";
import { StatKindNav } from "@/features/player-stats/components/StatKindNav";
import { canSeePlayerStats, statContexts } from "@/features/player-stats/lib/access";
import { getAllPlayerGames, getStatsProfiles } from "@/features/player-stats/lib/data";
import { computeStats, countByKind, filterByKind, formatWinRate, parseStatKind, recordLabel, type StatKind } from "@/features/player-stats/lib/stats";
import "@/features/player-stats/player-stats.css";

export const metadata: Metadata = { title: "Játékosok" };

const NONE_YET: Record<StatKind, string> = {
  all: "Még nincs lezárt játszmája",
  tournament: "Még nincs lezárt bajnoki meccse",
  ranked: "Még nincs lezárt ranked játszmája",
  casual: "Még nincs lezárt casual játszmája",
};

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ tipus?: string }> }) {
  await requireProfile();
  if (!(await canSeePlayerStats())) redirect(routes.organizer);
  const [{ tipus }, contexts] = await Promise.all([searchParams, statContexts()]);
  const [profiles, allGames] = await Promise.all([getStatsProfiles(), getAllPlayerGames(contexts)]);
  // Championships only until casual / ranked games count for this viewer: then the filter shows.
  const withFilter = contexts.length > 1;
  const kind: StatKind = withFilter ? parseStatKind(tipus) : "tournament";
  // Every game once (each is in both players' lists), for the counts on the filter.
  const unique = [...new Map([...allGames.values()].flat().map((g) => [g.gameId ?? g.matchId, g])).values()];
  const gamesByProfile = new Map([...allGames].map(([id, list]) => [id, filterByKind(list, kind)]));

  // Most games first, then the better win rate, then by name; players without games at the end.
  const rows = profiles
    .map((p) => ({ p, s: computeStats(gamesByProfile.get(p.id) ?? []) }))
    .sort((x, y) => y.s.total.games - x.s.total.games || (y.s.total.winRate ?? 0) - (x.s.total.winRate ?? 0) || x.p.karnyx_name.localeCompare(y.p.karnyx_name, "hu"));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="sec-h">
        <h1>Játékosok</h1>
      </div>
      <p className="muted mb-4 text-sm">
        {withFilter ? "Statisztikák" : "Bajnoki statisztikák"}: koppints egy játékosra a hőseihez és a meccstörténetéhez.
        <InfoTip
          text={
            withFilter
              ? "A Bajnokságok lezárt eredményei és a jóváhagyott casual és ranked játszmák számítanak; fent szűrhetsz típusra."
              : "Csak a Bajnokságok lezárt (mindkét fél által megerősített) eredményei számítanak."
          }
        />
      </p>
      {withFilter && (
        <div className="mb-4">
          <StatKindNav basePath={routes.players} kind={kind} counts={countByKind(unique)} />
        </div>
      )}
      <section className="ps-card">
        <ul className="ps-list">
          {rows.map(({ p, s }) => (
            <li key={p.id}>
              <Link className="ps-player" href={routes.player(p.id)}>
                <HeroAvatar name={p.karnyx_name} hero={s.heroes[0]?.hero} photo={avatarPublicUrl(p.avatar_path)} />
                <span className="min-w-0">
                  <span className="ps-name">{p.karnyx_name}</span>
                  <small>
                    {s.total.games === 0
                      ? NONE_YET[kind]
                      : `${s.total.games} meccs · ${recordLabel(s.total)}${s.heroes[0] ? ` · kedvenc: ${s.heroes[0].hero}` : ""}`}
                  </small>
                </span>
                <span className="ps-rate">{formatWinRate(s.total.winRate)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
