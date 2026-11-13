import Link from "next/link";
import { HeroAvatar } from "@/components/HeroAvatar";
import { heroPortrait } from "@/lib/heroes";
import { InfoTip } from "@/components/InfoTip";
import { formatShortDate } from "@/features/match-organizer/lib/time";
import { avatarPublicUrl } from "@/features/profile/lib/avatar";
import { routes } from "@/lib/routes";
import type { ProfileGame, StatsProfile } from "../lib/data";
import { formatWinRate, MIN_MATCHUP_GAMES, recordLabel, streakLabel, type HeroRecord, type PlayerStats } from "../lib/stats";
import "../player-stats.css";

/** Rows shown before "Továbbiak". */
const FIRST_HEROES = 8;
const FIRST_GAMES = 10;
/** Kitiltott hősök: only the most banned ones (Árpád, 2026-11-13). */
const MAX_BANS = 5;

const RESULT: Record<ProfileGame["outcome"], string> = { win: "Győzelem", draw: "Döntetlen", loss: "Vereség" };

function Bar({ r }: { r: HeroRecord }) {
  const pct = (n: number) => `${(n / r.games) * 100}%`;
  return (
    <span className="ps-bar" aria-hidden>
      <i className="w" style={{ width: pct(r.wins) }} />
      <i className="d" style={{ width: pct(r.draws) }} />
      <i className="l" style={{ width: pct(r.losses) }} />
    </span>
  );
}

function HeroRow({ r }: { r: HeroRecord }) {
  return (
    <li className="ps-hero">
      <HeroAvatar name={r.hero} hero={r.hero} photo={heroPortrait(r.hero)} />
      <span className="ps-name">{r.hero}</span>
      <span className="ps-rate">{formatWinRate(r.winRate)}</span>
      <span className="ps-rec">
        <Bar r={r} />
        <small>
          {r.games} meccs · {recordLabel(r)}
        </small>
      </span>
    </li>
  );
}

function GameRow({ g, timeZone }: { g: ProfileGame; timeZone: string }) {
  const opponent = g.opponentProfileId ? (
    <Link className="link" href={routes.player(g.opponentProfileId)}>
      {g.opponentName}
    </Link>
  ) : (
    g.opponentName
  );
  return (
    <li className={`ps-game ${g.outcome}`}>
      <span className="ps-res">
        <b>{RESULT[g.outcome]}</b>
        <small>{formatShortDate(g.date, timeZone)}</small>
      </span>
      <HeroAvatar name={g.hero ?? "?"} hero={g.hero} photo={heroPortrait(g.hero)} />
      <span className="ps-main">
        <b>{g.hero ?? "Ismeretlen hős"}</b>
        <small>
          vs. {opponent}
          {g.opponentHero ? ` (${g.opponentHero})` : ""} · életerő {g.hp}–{g.opponentHp}
        </small>
        <small>
          {g.tournamentName}, {g.round}. forduló
        </small>
      </span>
    </li>
  );
}

function Rows<T>({ items, first, render, more }: { items: T[]; first: number; render: (item: T) => React.ReactNode; more: string }) {
  return (
    <>
      <ul className="ps-list">{items.slice(0, first).map(render)}</ul>
      {items.length > first && (
        <details className="ps-more">
          <summary>
            {more} ({items.length - first})
          </summary>
          <ul className="ps-list">{items.slice(first).map(render)}</ul>
        </details>
      )}
    </>
  );
}

/** One player's stats page (also embedded on Profilom for the player's own). */
export function PlayerStatsView({
  profile,
  stats,
  timeZone,
  isOwn,
}: {
  profile: StatsProfile;
  stats: PlayerStats<ProfileGame>;
  timeZone: string;
  isOwn: boolean;
}) {
  const t = stats.total;
  const topHero = stats.heroes[0]?.hero ?? null;
  const tiles: [string, string][] = [
    [String(t.games), "Meccs"],
    [formatWinRate(t.winRate), "Győzelmi arány"],
    [`${t.wins}–${t.draws}–${t.losses}`, "Győzelem–döntetlen–vereség"],
    [String(stats.championships), "Bajnokság"],
    [streakLabel(stats.currentStreak), "Jelenlegi sorozat"],
    [String(stats.bestWinStreak), "Leghosszabb győzelmi sorozat"],
  ];
  const best = stats.matchups[0];
  const worst = stats.matchups.length > 1 ? stats.matchups[stats.matchups.length - 1] : null;

  return (
    <div className="space-y-4">
      <section className="card ps-head">
        <HeroAvatar name={profile.karnyx_name} hero={topHero} size="lg" photo={avatarPublicUrl(profile.avatar_path)} />
        <div className="min-w-0">
          <p className="kicker">{isOwn ? "A statisztikám" : "Játékos statisztika"}</p>
          <h1>{profile.karnyx_name}</h1>
          <p className="ps-sub">
            Bajnokság eredmények alapján
            <InfoTip text="Csak a Bajnokságok lezárt (mindkét fél által megerősített) eredményei számítanak. A régi Karnyx-liga meccseinél nincs rögzítve a győztes és a hős, ezért azok nem szerepelnek." />
          </p>
        </div>
      </section>

      {t.games === 0 ? (
        <p className="card muted">
          {isOwn ? "Még nincs lezárt bajnoki meccsed." : "Még nincs lezárt bajnoki meccse."} Az első megerősített eredmény után itt
          jelennek meg a statisztikák.
        </p>
      ) : (
        <>
          <section className="ps-tiles" aria-label="Összesítés">
            {tiles.map(([value, label]) => (
              <div key={label} className="ps-tile">
                <b>{value}</b>
                <span>{label}</span>
              </div>
            ))}
          </section>

          <div className="ps-cols">
            <section className="ps-card">
              <h2>Legtöbbet játszott hősök</h2>
              <p className="ps-note">Győzelmi arány hősönként (a döntetlen meccsnek számít, győzelemnek nem).</p>
              <Rows items={stats.heroes} first={FIRST_HEROES} more="További hősök" render={(r) => <HeroRow key={r.hero} r={r} />} />
            </section>

            <section className="ps-card">
              <h2>Meccstörténet</h2>
              <p className="ps-note">A legutóbbi meccsek elöl.</p>
              <Rows items={stats.games} first={FIRST_GAMES} more="Korábbi meccsek" render={(g) => <GameRow key={g.matchId} g={g} timeZone={timeZone} />} />
            </section>
          </div>

          {(best || stats.bans.length > 0) && (
            <div className="ps-cols">
              {best && (
                <section className="ps-card">
                  <h2>
                    Ellenfél hősök
                    <InfoTip text={`Csak azok a hősök, akik ellen legalább ${MIN_MATCHUP_GAMES} meccs volt, hogy egy-egy eredmény ne torzítson.`} />
                  </h2>
                  <p className="ps-note">
                    Legjobb: <strong>{best.hero}</strong> ellen ({formatWinRate(best.winRate)})
                    {worst && (
                      <>
                        {" "}
                        · legnehezebb: <strong>{worst.hero}</strong> ellen ({formatWinRate(worst.winRate)})
                      </>
                    )}
                  </p>
                  <ul className="ps-list">
                    {stats.matchups.map((r) => (
                      <HeroRow key={r.hero} r={r} />
                    ))}
                  </ul>
                </section>
              )}
              {stats.bans.length > 0 && (
                <section className="ps-card">
                  <h2>Kitiltott hősök</h2>
                  <p className="ps-note">Ezeket a hősöket tiltották ki leggyakrabban az ellenfelek.</p>
                  <ul className="ps-bans">
                    {stats.bans.slice(0, MAX_BANS).map((b) => (
                      <li key={b.hero} title={`${b.hero}: ${b.count}× kitiltva`}>
                        <HeroAvatar name={b.hero} hero={b.hero} size="md" photo={heroPortrait(b.hero)} />
                        <span className="ps-ban-count" aria-hidden>
                          {b.count}×
                        </span>
                        <span className="sr-only">
                          {b.hero}: {b.count}× kitiltva
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      )}

      <p className="text-sm">
        <Link className="link" href={routes.players}>
          Minden játékos statisztikája
        </Link>
      </p>
    </div>
  );
}
