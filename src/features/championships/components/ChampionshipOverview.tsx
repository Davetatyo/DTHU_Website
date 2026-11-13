import Link from "next/link";
import { PlayerLink } from "@/features/player-stats/components/PlayerLink";
import { PlayerAvatar } from "@/features/profile/components/PlayerAvatar";
import { RoundTimeline } from "@/features/match-organizer/components/RoundTimeline";
import { StatusBadge } from "@/features/match-organizer/components/StatusBadge";
import { ViewToggle } from "@/features/match-organizer/components/ViewToggle";
import { getPlayers, getRounds } from "@/features/match-organizer/lib/data";
import { sideOf } from "@/features/match-organizer/lib/play-mode";
import { formatDateTime, timeLeft } from "@/features/match-organizer/lib/time";
import type { ViewMode } from "@/features/match-organizer/lib/view";
import { InfoTip } from "@/components/InfoTip";
import { routes } from "@/lib/routes";
import type { ChampionshipAccess } from "@/features/championships/lib/access";
import { reportRights, reportStatus, resultButtonLabel } from "@/features/championships/lib/results";
import { isDecided, scoringLabel, scoringOf, swissRoundCount, tournamentStandings } from "@/features/championships/lib/rules";
import { getChampionshipMatches, getMatchReports } from "@/features/championships/lib/run";
import type { Championship, ChampionshipMatch, MatchReport } from "@/features/championships/lib/types";
import { ChampionshipMatchCards, ChampionshipMatchList } from "./ChampionshipMatches";
import { ParticipantList } from "./ParticipantList";
import { ResultPanel } from "./ResultPanel";
import { StandingsTable } from "./StandingsTable";

export const VIEW_COOKIE = "nezet";

/**
 * A started championship in the Időpontfoglaló's layout: round header, round timeline, the
 * round's pairings (list or cards), the viewer's own match with the time and result buttons,
 * the round's progress, then earlier rounds, standings and players. `access` "readonly" is for
 * people following a championship they don't play in.
 */
export async function ChampionshipOverview({
  tournament: t,
  access,
  viewerName,
  adminView,
  timeZone: tz,
  view,
}: {
  tournament: Championship;
  access: Exclude<ChampionshipAccess, "signup" | "hidden">;
  viewerName: string | null;
  adminView: boolean;
  timeZone: string;
  view: ViewMode;
}) {
  const [players, rounds, matches] = await Promise.all([getPlayers(t.id), getRounds(t.id), getChampionshipMatches(t.id)]);
  const round = rounds[0] ?? null;
  const roundMatches = round ? byTable(matches.filter((m) => m.round_id === round.id)) : [];
  const reports = await getMatchReports(matches.map((m) => m.id));
  const nameOf = new Map(players.map((p) => [p.id, p.karnyx_name]));
  const table = tournamentStandings(t, players, rounds, matches, reports);
  const total = swissRoundCount(t.settings, players.length);
  const finished = t.status === "finished";
  const path = routes.championship(t.slug);

  const real = roundMatches.filter((m) => m.b);
  const decided = real.filter(isDecided).length;
  const open = real.filter((m) => !isDecided(m));
  const awaiting = open.filter((m) => reportStatus(reports.get(m.id) ?? null) === "pending").length;
  const count = (s: string) => open.filter((m) => m.status === s && reportStatus(reports.get(m.id) ?? null) === "none").length;
  const myMatch = access === "full" && viewerName ? roundMatches.find((m) => sideOf(m, viewerName)) : undefined;
  const roundOpen = !!round && !round.closed_at && !round.completed_at && !finished;

  return (
    <div className="space-y-6">
      {access === "readonly" && !adminView && (
        <p className="alert-info">Ebben a bajnokságban nem játszol, de élőben követheted a párosításokat és az állást.</p>
      )}

      <section className="hero3">
        <div className="img" />
        <div className="in">
          <span className={`livechip${roundOpen ? "" : " done"}`}>
            {finished ? "Véget ért" : round ? (roundOpen ? `Élő · ${round.number}. forduló` : `${round.number}. forduló · kész`) : "Elindult"}
          </span>
          <h1>{t.name}</h1>
          <div className="meta">
            <span>
              <b>{players.length}</b> játékos
            </span>
            {round && (
              <span>
                <b>
                  {round.number}/{total}
                </b>{" "}
                forduló
              </span>
            )}
            {round && (
              <span>
                <b>
                  {decided}/{real.length}
                </b>{" "}
                meccs eredménye végleges
              </span>
            )}
            {round && !finished && (
              <span>
                Határidő: <b>{formatDateTime(round.deadline, tz)}</b>
                {roundOpen && <> ({timeLeft(round.deadline)})</>}
              </span>
            )}
            {finished && table[0] && (
              <span>
                Győztes: <b>{nameOf.get(table[0].id)}</b> 🏆
              </span>
            )}
          </div>
        </div>
      </section>

      {rounds.length > 1 && <RoundTimeline rounds={rounds} timeZone={tz} />}

      {!round ? (
        <p className="card muted">A bajnokság elindult, a párosítás hamarosan elkészül.</p>
      ) : (
        <div className="l3">
          {/* Phones: the own match first, above the pairings (the side column comes last there). */}
          {myMatch && (
            <div className="ch-mine-top">
              <MyMatch match={myMatch} viewerName={viewerName} adminView={adminView} report={reports.get(myMatch.id) ?? null} path={path} timeZone={tz} />
            </div>
          )}
          <section className="min-w-0 space-y-5">
            <div>
              <div className="hh">
                <h2>{round.number}. forduló · párosítások</h2>
                <ViewToggle current={view} path={path} cookie={VIEW_COOKIE} />
              </div>
              {view === "kartyak" ? (
                <ChampionshipMatchCards matches={roundMatches} reports={reports} timeZone={tz} viewerName={viewerName} />
              ) : (
                <ChampionshipMatchList matches={roundMatches} reports={reports} timeZone={tz} viewerName={viewerName} />
              )}
            </div>

            {rounds.slice(1).map((r) => (
              <details key={r.id} className="panel3 p-4">
                <summary className="cursor-pointer font-bold">
                  {r.number}. forduló <span className="muted text-sm font-normal">· {formatDateTime(r.starts_at, tz)}</span>
                </summary>
                <div className="mt-3">
                  <ChampionshipMatchList
                    matches={byTable(matches.filter((m) => m.round_id === r.id))}
                    reports={reports}
                    timeZone={tz}
                    viewerName={viewerName}
                    grouped={false}
                  />
                </div>
              </details>
            ))}
          </section>

          <aside className="space-y-5">
            {myMatch && (
              <div className="ch-mine-side">
                <MyMatch match={myMatch} viewerName={viewerName} adminView={adminView} report={reports.get(myMatch.id) ?? null} path={path} timeZone={tz} />
              </div>
            )}

            <div>
              <div className="hh">
                <h2>A forduló állása</h2>
              </div>
              <div className="panel3 space-y-3 p-4">
                <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }} aria-hidden>
                  <span style={{ width: `${(decided / Math.max(1, real.length)) * 100}%`, background: "var(--gold)" }} />
                  <span style={{ width: `${(awaiting / Math.max(1, real.length)) * 100}%`, background: "var(--info)" }} />
                </div>
                <ul className="space-y-1.5 text-sm">
                  {/* Admin view only: the counts players don't need (the rows already show them). */}
                  {adminView && (
                    <li className="flex justify-between"><span className="badge badge-played">Végeredmény</span><b>{decided}</b></li>
                  )}
                  <li className="flex justify-between"><span className="badge" style={{ color: "var(--info)" }}>Eredmény jóváhagyásra vár</span><b>{awaiting}</b></li>
                  {adminView && (
                    <li className="flex justify-between"><span className="badge badge-confirmed">Időpont megerősítve</span><b>{count("confirmed")}</b></li>
                  )}
                  <li className="flex justify-between"><span className="badge badge-proposed">Időpont javasolva</span><b>{count("proposed")}</b></li>
                  <li className="flex justify-between"><span className="badge badge-pending">Nincs időpont</span><b>{count("pending")}</b></li>
                </ul>
                {round.completed_at && (
                  <p className="text-sm font-semibold" style={{ color: "var(--ok)" }}>
                    A forduló minden eredménye végleges 🏁
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {table.length > 0 && (
        <section className="space-y-2">
          <div className="hh">
            <h2>
              Állás
              <InfoTip text={`Pontozás: ${scoringLabel(scoringOf(t.settings))}. Sorrend: pont, Buchholz (az összes ellenfél pontjainak összege), életerő-különbség, egymás elleni eredmény.`} />
            </h2>
          </div>
          <div className="panel3 p-4">
            <StandingsTable standings={table} nameMap={nameOf} scoringText={scoringLabel(scoringOf(t.settings))} showTiebreaks={adminView} />
          </div>
        </section>
      )}

      <section className="space-y-2">
        <div className="hh">
          <h2>Játékosok ({players.length})</h2>
        </div>
        <ParticipantList people={players.map((p) => ({ name: p.karnyx_name, heroes: p.heroes }))} />
      </section>
    </div>
  );
}

function byTable(list: ChampionshipMatch[]): ChampionshipMatch[] {
  return [...list].sort((a, b) => a.table_no - b.table_no);
}

/** "Következő meccsem": the viewer's match in the latest round, with the time and result buttons. */
function MyMatch({
  match: m,
  viewerName,
  adminView,
  report,
  path,
  timeZone,
}: {
  match: ChampionshipMatch;
  viewerName: string | null;
  adminView: boolean;
  report: MatchReport | null;
  path: string;
  timeZone: string;
}) {
  const side = sideOf(m, viewerName);
  const me = side === "a" ? m.a : m.b;
  const opponent = side === "a" ? m.b : m.a;
  const decided = isDecided(m);
  const status = reportStatus(report);
  const rights = reportRights(report, { side, admin: adminView });

  return (
    <div>
      <div className="hh">
        <h2>Következő meccsem</h2>
      </div>
      <div className="panel3 space-y-3 p-4">
        <div className="vsbox">
          <div className="p">
            <PlayerLink name={me?.karnyx_name} decorative>
              <PlayerAvatar name={me?.karnyx_name ?? null} hero={me?.heroes[0]} size="md" />
            </PlayerLink>
            <b>
              <PlayerLink name={me?.karnyx_name} />
            </b>
          </div>
          <span className="vsx">VS</span>
          <div className="p">
            <PlayerLink name={opponent?.karnyx_name} decorative>
              <PlayerAvatar name={opponent?.karnyx_name ?? null} hero={opponent?.heroes[0]} size="md" />
            </PlayerLink>
            <b>{opponent ? <PlayerLink name={opponent.karnyx_name} /> : "Bye"}</b>
            <small>{opponent ? opponent.heroes.join(", ") : "nincs ellenfél"}</small>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          {status === "locked" ? (
            m.is_draw && <span className="badge badge-played">Döntetlen</span>
          ) : status === "pending" ? (
            <span className="badge" style={{ color: "var(--info)" }}>Eredmény jóváhagyásra vár</span>
          ) : (
            m.status !== "confirmed" && <StatusBadge status={m.status} />
          )}
          {m.scheduled_at && m.status === "confirmed" && (
            <span className="font-semibold first-letter:uppercase">{formatDateTime(m.scheduled_at, timeZone)}</span>
          )}
          {opponent && (
            <div className="flex flex-wrap justify-center gap-2">
              {!decided && (
                <Link href={routes.match(m.id)} className="btn btn-sm btn-secondary">
                  {m.scheduled_at ? "Időpont módosítása" : "Időpont egyeztetés"}
                </Link>
              )}
              {(rights.canSubmit || rights.canConfirm) && (
                <ResultPanel
                  matchId={m.id}
                  back={path}
                  a={{ name: m.a.karnyx_name, heroes: m.a.heroes }}
                  b={{ name: m.b!.karnyx_name, heroes: m.b!.heroes }}
                  report={report}
                  viewerSide={side}
                  {...rights}
                  label={resultButtonLabel(status, rights)}
                  highlight={rights.canConfirm || status === "none"}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
