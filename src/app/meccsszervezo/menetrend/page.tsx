import type { Metadata } from "next";
import { CopyButton } from "@/components/CopyButton";
import { InfoTip } from "@/components/InfoTip";
import { MatchRow } from "@/features/match-organizer/components/MatchList";
import { getCurrentProfile, sameName } from "@/lib/auth";
import { getActiveTournament, getPlayers, getScheduledMatches } from "@/features/match-organizer/lib/data";
import { googleSubscribeUrl, webcalUrl } from "@/features/match-organizer/lib/ics";
import { groupMatches } from "@/features/match-organizer/lib/schedule";
import { routes } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site";
import { DEFAULT_TIMEZONE } from "@/features/match-organizer/lib/time";
import Link from "next/link";
import { ModeIcon } from "@/features/match-organizer/components/ModeTag";
import { MATCH_MODE_LABELS, matchMode, MODE_PARAM, PARAM_FOR, type MatchMode } from "@/features/match-organizer/lib/play-mode";

export const metadata: Metadata = { title: "Közelgő meccsek" };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ jatekos?: string; mod?: string }> }) {
  const { jatekos, mod } = await searchParams;
  const wanted: MatchMode | null = (mod && MODE_PARAM[mod]) || null;
  const viewer = await getCurrentProfile();
  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const tournament = await getActiveTournament();
  if (!tournament) return <p className="card">Még nincs aktív verseny.</p>;

  const players = await getPlayers(tournament.id);
  // Show matches that started up to 2 hours ago, so ongoing games are still listed.
  const all = await getScheduledMatches(tournament.id, new Date(Date.now() - 2 * 3600_000));
  const byPlayer = all.filter(
    (m) => m.status === "confirmed" && (!jatekos || sameName(m.a.karnyx_name, jatekos) || sameName(m.b?.karnyx_name, jatekos)),
  );
  // Játékmód filter (TTS / Webkamera / Hibrid), on top of the player filter.
  const counts = { tts: 0, webcam: 0, hybrid: 0 } as Record<MatchMode, number>;
  for (const m of byPlayer) {
    const md = matchMode(m);
    if (md) counts[md]++;
  }
  const matches = wanted ? byPlayer.filter((m) => matchMode(m) === wanted) : byPlayer;
  const filterHref = (m: MatchMode | null) => {
    const q = new URLSearchParams();
    if (jatekos) q.set("jatekos", jatekos);
    if (m) q.set("mod", PARAM_FOR[m]);
    const qs = q.toString();
    return `${routes.schedule}${qs ? `?${qs}` : ""}`;
  };
  const now = new Date();
  const days = groupMatches(matches, tz, now);
  const mine = (name: string | undefined) => sameName(name, viewer?.karnyx_name);

  const site = await getSiteUrl();
  const feedUrl = `${site}${routes.calendarFeed}${jatekos ? `?player=${encodeURIComponent(jatekos)}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <div className="sec-h">
          <h1>Közelgő meccsek</h1>
        </div>
        <p className="lead">Megerősített időpontok napra bontva. Iratkozz fel, és a változások maguktól megjelennek a naptáradban.</p>
      </div>

      <div className="l3">
        <section className="min-w-0">
          <form className="mb-3 flex flex-wrap gap-2">
            {mod && <input type="hidden" name="mod" value={mod} />}
            <select name="jatekos" defaultValue={jatekos ?? ""} className="input max-w-xs" aria-label="Játékos">
              <option value="">Minden játékos</option>
              {players.map((p) => (
                <option key={p.id} value={p.karnyx_name}>
                  {p.karnyx_name}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary">Szűrés</button>
          </form>
          <nav className="pm-filter mb-4" aria-label="Játékmód">
            <Link href={filterHref(null)} className={`pm-chip${wanted ? "" : " on"}`} aria-current={wanted ? undefined : "true"}>
              Mind <small>{byPlayer.length}</small>
            </Link>
            {(["tts", "webcam", "hybrid"] as const).map((m) => (
              <Link key={m} href={filterHref(m)} className={`pm-chip${wanted === m ? " on" : ""}`} aria-current={wanted === m ? "true" : undefined}>
                <ModeIcon mode={m} />
                {MATCH_MODE_LABELS[m]} <small>{counts[m]}</small>
              </Link>
            ))}
            <InfoTip text="Minden játékos a saját meccsén választja ki, hogy TTS-en vagy webkamerával játszik (aki nem választ, webkamerásnak számít). TTS: mindketten TTS-en, Webkamera: mindketten webkamerával, Hibrid: egyikük így, másikuk úgy." />
          </nav>

          {days.length === 0 && <p className="card muted">{wanted ? "Nincs ilyen játékmódú megbeszélt közelgő meccs." : "Nincs megbeszélt közelgő meccs."}</p>}
          {days.map((d) => (
            <section key={d.key}>
              <div className="dayh">
                <b>{d.title}</b>
                {d.sub && <span>{d.sub}</span>}
              </div>
              {d.matches.map((m) => (
                <MatchRow key={m.id} match={m} timeZone={tz} mine={mine(m.a.karnyx_name) || mine(m.b?.karnyx_name)} now={now} />
              ))}
            </section>
          ))}
        </section>

        <aside>
          <div className="hh">
            <h2>
              Feliratkozás naptárban
              <InfoTip text="Feliratkozás után a naptárad magától frissül, amikor új meccs kerül megbeszélésre vagy egy időpont változik. Egy játékost kiválasztva csak az ő meccseire iratkozhatsz fel." />
            </h2>
          </div>
          <div className="panel3 space-y-3 p-4">
            <p className="text-sm font-semibold">{jatekos ? `${jatekos} meccsei` : "Az összes meccs"}</p>
            <p className="muted text-sm">
              Az új és módosított meccsek maguktól megjelennek a naptáradban. A Google Naptár csak néhány óránként frissít,
              az Apple és az Outlook gyakrabban.
            </p>
            <div className="flex flex-wrap gap-2">
              <a className="btn btn-sm" href={googleSubscribeUrl(feedUrl)} target="_blank" rel="noreferrer">
                Google Naptár
              </a>
              <a className="btn btn-secondary btn-sm" href={webcalUrl(feedUrl)}>
                Apple / Outlook
              </a>
              <CopyButton text={feedUrl} label="Naptár link másolása" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
