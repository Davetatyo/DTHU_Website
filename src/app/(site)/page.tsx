import Link from "next/link";
import { Art } from "@/components/Art";
import { HeroAvatar } from "@/components/HeroAvatar";
import { MatchList } from "@/features/match-organizer/components/MatchList";
import { StatusBadge } from "@/features/match-organizer/components/StatusBadge";
import { getActiveTournament, getLatestRound, getRoundMatches, isParticipant } from "@/features/match-organizer/lib/data";
import { DEFAULT_TIMEZONE, timeLeft } from "@/features/match-organizer/lib/time";
import { NEWS, NEWSART, NEWSLBL, NEWSLINK } from "@/features/landing-page/data/news";
import { PowerRanking } from "@/features/rankings/components/PowerRanking";
import { loadRanking, rowOf } from "@/features/rankings/lib/load";
import { getCurrentProfile, sameName } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/landing-page/news.css";

// Site home ("Hírek"), prototype V3. The tournament banner and the match schedule are real
// Meccsszervező data; news, ranking numbers and tickets are sample data for now.
export default async function NewsPage() {
  const viewer = await getCurrentProfile();
  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const tournament = await getActiveTournament();
  const round = tournament ? await getLatestRound(tournament.id) : null;
  const matches = round ? await getRoundMatches(round.id) : [];
  const real = matches.filter((m) => m.status !== "bye");
  const played = real.filter((m) => m.status === "played").length;
  const players = new Set(matches.flatMap((m) => [m.a.karnyx_name, ...(m.b ? [m.b.karnyx_name] : [])])).size;
  const myMatch = viewer ? matches.find((m) => isParticipant(m, viewer.karnyx_name)) : undefined;
  const meSide = myMatch && (sameName(myMatch.a.karnyx_name, viewer?.karnyx_name) ? myMatch.a : myMatch.b);
  const opp = myMatch && (meSide === myMatch.a ? myMatch.b : myMatch.a);
  const upcoming = matches.filter((m) => m.status === "confirmed" && m.scheduled_at && Date.parse(m.scheduled_at) > Date.now() - 86_400_000);
  const ranking = await loadRanking();
  const myTickets = rowOf(ranking, viewer?.karnyx_name)?.tix;

  return (
    <div className="space-y-7">
      <section className="hero3">
        <div className="img" />
        <div className="in">
          <span className={`livechip${round && !round.closed_at ? "" : " done"}`}>
            {round ? `Élő · ${round.number}. forduló` : "Szünet"}
          </span>
          <h1>{tournament?.name ?? "DTHU Online Bajnokság"}</h1>
          {round && (
            <div className="meta">
              <span>
                <b>{players}</b> játékos
              </span>
              <span>
                <b>
                  {played}/{real.length}
                </b>{" "}
                meccs lejátszva
              </span>
              <span>
                Határidő: <b>{timeLeft(round.deadline)}</b>
              </span>
            </div>
          )}
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
            <Link href={routes.organizer} className="btn btn-secondary">
              Versenyprogram
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="hh">
          <h2>Hírek</h2>
        </div>
        <div className="news4">
          {NEWS.map((n) => (
            <Link key={n.t} className="ncard" href={NEWSLINK[n.i]}>
              <span className="pic">
                <Art spec={NEWSART[n.i]} />
              </span>
              <span className="lbl">{NEWSLBL[n.i]}</span>
              <b>{n.t}</b>
              <small>{n.d}</small>
            </Link>
          ))}
        </div>
      </section>

      <div className="l3">
        <section className="min-w-0">
          <div className="hh">
            <h2>Versenyprogram</h2>
          </div>
          {upcoming.length ? (
            <MatchList matches={upcoming} timeZone={tz} highlight={viewer?.karnyx_name} />
          ) : (
            <p className="muted">Nincs több megbeszélt közelgő meccs. Nézz vissza később!</p>
          )}
          <p className="mt-3">
            <Link href={routes.organizer} className="font-bold" style={{ color: "var(--teal)" }}>
              Teljes versenyprogram ›
            </Link>
          </p>
        </section>

        <aside className="space-y-5">
          {myMatch && (
            <div>
              <div className="hh">
                <h2>Következő meccsem</h2>
              </div>
              <Link href={routes.match(myMatch.id)} className="panel3 block p-4">
                <div className="vsbox">
                  <div className="p">
                    <HeroAvatar name={meSide?.karnyx_name ?? null} hero={meSide?.heroes[0]} size="md" />
                    <b>{meSide?.karnyx_name}</b>
                  </div>
                  <span className="vsx">VS</span>
                  <div className="p">
                    <HeroAvatar name={opp?.karnyx_name ?? null} hero={opp?.heroes[0]} size="md" />
                    <b>{opp?.karnyx_name ?? "Bye"}</b>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <StatusBadge status={myMatch.status} />
                </div>
              </Link>
            </div>
          )}
          <div>
            <div className="hh">
              <h2>DTHU Power Ranking</h2>
              <Link href={routes.rankings}>Teljes rangsor ›</Link>
            </div>
            <div className="panel3 overflow-hidden">
              <PowerRanking rows={ranking} limit={8} me={viewer?.karnyx_name} />
            </div>
          </div>
          <Link href={routes.tickets} className="tile block" style={{ minHeight: 150 }}>
            <Art spec={{ c1: "#e0b24a", c2: "#7a2fb0", g: "ticket", prompt: "glowing golden tickets, esports reward banner" }} />
            <div className="in">
              <span className="k">Jegyek</span>
              <h3>{myTickets !== undefined ? `${myTickets} jegyed van` : "Gyűjts jegyet minden meccsért"}</h3>
            </div>
          </Link>
        </aside>
      </div>
    </div>
  );
}
