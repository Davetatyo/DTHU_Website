import { cookies } from "next/headers";
import Link from "next/link";
import { HeroAvatar } from "@/components/HeroAvatar";
import { MatchList } from "@/features/match-organizer/components/MatchList";
import { MatchupGrid } from "@/features/match-organizer/components/MatchupGrid";
import { RoundTimeline } from "@/features/match-organizer/components/RoundTimeline";
import { StatusBadge } from "@/features/match-organizer/components/StatusBadge";
import { ViewToggle } from "@/features/match-organizer/components/ViewToggle";
import { getCurrentProfile, sameName } from "@/lib/auth";
import {
  getActiveTournament,
  getOpenProposalCounts,
  getRegisteredKarnyxNames,
  getRoundMatches,
  getRounds,
  isParticipant,
} from "@/features/match-organizer/lib/data";
import { isProfileComplete } from "@/features/match-organizer/lib/profile";
import { DEFAULT_TIMEZONE, formatDateTime, timeLeft } from "@/features/match-organizer/lib/time";
import { resolveView } from "@/features/match-organizer/lib/view";
import { routes } from "@/lib/routes";

// Players see the compact list by default; their choice is remembered in this cookie.
const VIEW_COOKIE = "nezet";

export default async function OrganizerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; nezet?: string }>;
}) {
  const { uzenet, nezet } = await searchParams;
  const view = resolveView(nezet, (await cookies()).get(VIEW_COOKIE)?.value, "lista");
  const viewer = await getCurrentProfile();
  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const tournament = await getActiveTournament();
  const rounds = tournament ? await getRounds(tournament.id) : [];
  const round = rounds[0] ?? null;
  const matches = round ? await getRoundMatches(round.id) : [];
  const myMatch = viewer ? matches.find((m) => isParticipant(m, viewer.karnyx_name)) : undefined;
  const opponent = myMatch && (sameName(myMatch.a.karnyx_name, viewer?.karnyx_name) ? myMatch.b : myMatch.a);
  const me = myMatch && (sameName(myMatch.a.karnyx_name, viewer?.karnyx_name) ? myMatch.a : myMatch.b);

  const real = matches.filter((m) => m.status !== "bye");
  const count = (s: string) => real.filter((m) => m.status === s).length;
  const played = count("played");
  const playerCount = new Set(matches.flatMap((m) => [m.a.karnyx_name, ...(m.b ? [m.b.karnyx_name] : [])])).size;
  const roundOpen = round && !round.closed_at && !round.completed_at;

  return (
    <div className="space-y-6">
      {uzenet === "profil" && <p className="alert-ok">Profil mentve.</p>}

      {viewer && !isProfileComplete(viewer) && (
        <p className="alert-info">
          Még nem töltötted ki a profilodat.{" "}
          <Link href={routes.profile} className="link">
            Profil kitöltése
          </Link>
        </p>
      )}

      {!tournament || !round ? (
        <section className="hero3">
          <div className="img" />
          <div className="in">
            <span className="livechip done">Szünet</span>
            <h1>Még nincs aktív forduló</h1>
            <div className="meta">Amint az admin elindítja a következő fordulót, itt látod a párosításokat.</div>
          </div>
        </section>
      ) : (
        <>
          <section className="hero3">
            <div className="img" />
            <div className="in">
              <span className={`livechip${roundOpen ? "" : " done"}`}>
                {roundOpen ? `Élő · ${round.number}. forduló` : `${round.number}. forduló · befejeződött`}
              </span>
              <h1>{tournament.name}</h1>
              <div className="meta">
                <span>
                  <b>{playerCount}</b> játékos
                </span>
                <span>
                  <b>
                    {played}/{real.length}
                  </b>{" "}
                  meccs lejátszva
                </span>
                <span>
                  Határidő: <b>{formatDateTime(round.deadline, tz)}</b>
                  {roundOpen && <> ({timeLeft(round.deadline)})</>}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {myMatch ? (
                  <Link href={routes.match(myMatch.id)} className="btn">
                    Saját meccsem
                  </Link>
                ) : !viewer ? (
                  <Link href={routes.login} className="btn btn-discord">
                    Belépés Discorddal
                  </Link>
                ) : null}
                <Link href={routes.schedule} className="btn btn-secondary">
                  Közelgő meccsek
                </Link>
              </div>
            </div>
          </section>

          {rounds.length > 1 && <RoundTimeline rounds={rounds} timeZone={tz} />}

          <div className="l3">
            <section className="min-w-0">
              <div className="hh">
                <h2>{round.number}. forduló · párosítások</h2>
                <ViewToggle current={view} path={routes.organizer} cookie={VIEW_COOKIE} />
              </div>
              {view === "kartyak" ? (
                <MatchupGrid
                  matches={matches}
                  timeZone={tz}
                  registeredNames={await getRegisteredKarnyxNames()}
                  openProposalCounts={await getOpenProposalCounts(matches.map((m) => m.id))}
                  highlight={viewer?.karnyx_name}
                />
              ) : (
                <MatchList matches={matches} timeZone={tz} highlight={viewer?.karnyx_name} />
              )}
            </section>

            <aside className="space-y-5">
              {myMatch && (
                <div>
                  <div className="hh">
                    <h2>Következő meccsem</h2>
                  </div>
                  <Link href={routes.match(myMatch.id)} className="panel3 block p-4 hover:border-[var(--gold-dim)]">
                    <div className="vsbox">
                      <div className="p">
                        <HeroAvatar name={me?.karnyx_name ?? null} hero={me?.heroes[0]} size="md" />
                        <b>{me?.karnyx_name}</b>
                        <small>{me?.heroes[0]}</small>
                      </div>
                      <span className="vsx">VS</span>
                      <div className="p">
                        <HeroAvatar name={opponent?.karnyx_name ?? null} hero={opponent?.heroes[0]} size="md" />
                        <b>{opponent?.karnyx_name ?? "Bye"}</b>
                        <small>{opponent?.heroes[0] ?? "nincs ellenfél"}</small>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col items-center gap-1 text-center">
                      <StatusBadge status={myMatch.status} />
                      {myMatch.scheduled_at && myMatch.status === "confirmed" && (
                        <span className="font-semibold first-letter:uppercase">{formatDateTime(myMatch.scheduled_at, tz)}</span>
                      )}
                      {(myMatch.status === "pending" || myMatch.status === "proposed") && (
                        <span className="text-sm font-bold" style={{ color: "var(--teal)" }}>
                          Időpont egyeztetése ›
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              )}

              {!viewer && (
                <div className="panel3 space-y-3 p-4">
                  <p className="text-sm">Lépj be Discorddal, és rögtön látod, ki az ellenfeled, és egyeztethetitek az időpontot.</p>
                  <Link href={routes.login} className="btn btn-discord w-full">
                    Belépés Discorddal
                  </Link>
                </div>
              )}

              <div>
                <div className="hh">
                  <h2>A forduló állása</h2>
                </div>
                <div className="panel3 space-y-3 p-4">
                  <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }} aria-hidden>
                    <span style={{ width: `${(played / Math.max(1, real.length)) * 100}%`, background: "var(--gold)" }} />
                    <span style={{ width: `${(count("confirmed") / Math.max(1, real.length)) * 100}%`, background: "var(--ok)" }} />
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex justify-between"><span className="badge badge-played">Lejátszva</span><b>{played}</b></li>
                    <li className="flex justify-between"><span className="badge badge-confirmed">Megerősítve</span><b>{count("confirmed")}</b></li>
                    <li className="flex justify-between"><span className="badge badge-proposed">Javasolva</span><b>{count("proposed")}</b></li>
                    <li className="flex justify-between"><span className="badge badge-pending">Nincs időpont</span><b>{count("pending")}</b></li>
                  </ul>
                  {round.completed_at && <p className="text-sm font-semibold" style={{ color: "var(--ok)" }}>A forduló minden meccse lement 🏁</p>}
                </div>
              </div>

              <Link href={routes.schedule} className="tile block" style={{ minHeight: 130 }}>
                <div className="img ph-art" style={{ "--c1": "#4f8fe0", "--c2": "#c89b3c" } as React.CSSProperties} />
                <div className="in">
                  <span className="kicker">Naptár</span>
                  <b className="text-lg text-white">Közelgő meccsek és feliratkozás</b>
                </div>
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
