import { routes } from "@/lib/routes";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { InfoTip } from "@/components/InfoTip";
import { getCurrentProfile, sameName } from "@/lib/auth";
import { getActiveTournament, getPlayers, getScheduledMatches } from "@/features/match-organizer/lib/data";
import { googleSubscribeUrl, webcalUrl } from "@/features/match-organizer/lib/ics";
import { getSiteUrl } from "@/lib/site";
import { DEFAULT_TIMEZONE, dayKey, formatDay, formatTime } from "@/features/match-organizer/lib/time";
import type { MatchView } from "@/features/match-organizer/lib/types";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ jatekos?: string }> }) {
  const { jatekos } = await searchParams;
  const viewer = await getCurrentProfile();
  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const tournament = await getActiveTournament();
  if (!tournament) return <p className="card">Még nincs aktív verseny.</p>;

  const players = await getPlayers(tournament.id);
  // Show matches that started up to 2 hours ago, so ongoing games are still listed.
  const all = await getScheduledMatches(tournament.id, new Date(Date.now() - 2 * 3600_000));
  const matches = all.filter(
    (m) => m.status === "confirmed" && (!jatekos || sameName(m.a.karnyx_name, jatekos) || sameName(m.b?.karnyx_name, jatekos)),
  );

  const byDay = new Map<string, MatchView[]>();
  for (const m of matches) {
    const key = dayKey(m.scheduled_at!, tz);
    byDay.set(key, [...(byDay.get(key) ?? []), m]);
  }

  const site = await getSiteUrl();
  const feedUrl = `${site}/api/calendar${jatekos ? `?player=${encodeURIComponent(jatekos)}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Közelgő meccsek</h1>
        <form className="flex gap-2">
          <select name="jatekos" defaultValue={jatekos ?? ""} className="input">
            <option value="">Minden játékos</option>
            {players.map((p) => (
              <option key={p.id} value={p.karnyx_name}>
                {p.karnyx_name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary">Szűrés</button>
        </form>
      </div>

      {byDay.size === 0 && <p className="card muted">Nincs megbeszélt közelgő meccs.</p>}

      {[...byDay.entries()].map(([key, dayMatches]) => (
        <section key={key} className="card">
          <h2 className="font-bold capitalize">{formatDay(dayMatches[0].scheduled_at!, tz)}</h2>
          <ul className="mt-2 space-y-1">
            {dayMatches.map((m) => (
              <li key={m.id}>
                <Link href={routes.match(m.id)} className="flex gap-3 py-1 hover:opacity-80">
                  <span className="w-12 font-mono font-semibold">{formatTime(m.scheduled_at!, tz)}</span>
                  <span className="flex-1">
                    {m.a.karnyx_name} <span className="muted">vs</span> {m.b?.karnyx_name}
                  </span>
                  <span className="muted text-sm">{m.round.number}. forduló</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card space-y-3">
        <h2 className="font-bold">
          Feliratkozás naptárban {jatekos ? `(${jatekos} meccsei)` : "(összes meccs)"}
          <InfoTip text="Feliratkozás után a naptárad magától frissül, amikor új meccs kerül megbeszélésre vagy egy időpont változik. Fent egy játékost kiválasztva csak az ő meccseire iratkozhatsz fel." />
        </h2>
        <p className="muted text-sm">
          Feliratkozás után az új és módosított meccsek maguktól megjelennek a naptáradban. A Google Naptár csak
          néhány óránként frissít, az Apple és az Outlook gyakrabban.
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
      </section>
    </div>
  );
}
