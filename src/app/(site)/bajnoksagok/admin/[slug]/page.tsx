import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import {
  deleteChampionship,
  openRegistration,
  removeRegistration,
  startTournamentNow,
  updateStartTime,
} from "@/features/championships/actions/admin";
import { EngineRoundSection } from "@/features/championships/components/EngineRoundSection";
import { PlayerLink } from "@/features/player-stats/components/PlayerLink";
import { PlayerAvatar } from "@/features/profile/components/PlayerAvatar";
import { getPlayers, getRounds } from "@/features/match-organizer/lib/data";
import { formatDateTime, utcToWallTime } from "@/features/match-organizer/lib/time";
import { getChampionshipMatches, startDue, getRegistrations, getTournamentBySlug } from "@/features/championships/lib/run";
import { FORMAT_LABELS, scoringLabel, scoringOf, STATUS_LABELS } from "@/features/championships/lib/rules";
import { HeroIcons } from "@/components/HeroIcon";

export const metadata: Metadata = { title: "Verseny kezelése" };

export default async function AdminTournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const [{ slug }, { uzenet, hiba }] = await Promise.all([params, searchParams]);
  const me = await requireAdmin();
  const found = await getTournamentBySlug(slug);
  if (!found) notFound();
  if (await startDue([found])) redirect(routes.championshipAdmin(found.slug));
  const t = found;
  const tz = me.timezone;
  const back = routes.championshipAdmin(t.slug);
  const beforeStart = t.status === "draft" || t.status === "registration";

  const registrations = beforeStart ? await getRegistrations(t.id) : [];
  const [players, rounds, matches] = beforeStart
    ? [[], [], []]
    : await Promise.all([getPlayers(t.id), getRounds(t.id), getChampionshipMatches(t.id)]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href={routes.championshipsAdmin} className="muted text-sm">
          ← Bajnokságok kezelése
        </Link>
        <div className="sec-h">
          <h1>{t.name}</h1>
        </div>
        <p className="muted text-sm">
          <span className="badge badge-proposed">{STATUS_LABELS[t.status]}</span> {FORMAT_LABELS[t.format]}
          {t.best_of > 1 && ` · Bo${t.best_of}`}
          {t.settings.rounds ? ` · ${t.settings.rounds} forduló` : " · fordulók: automatikus"}
          {` · ${scoringLabel(scoringOf(t.settings))}`}
          {` · ${t.auto_pairing ? "automatikus" : "kézi"} párosítás`} ·{" "}
          {t.status !== "draft" && (
            <Link href={routes.championship(t.slug)} className="underline">
              játékos nézet
            </Link>
          )}
        </p>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      {beforeStart && (
        <section className="card space-y-4">
          <h2 className="text-lg font-bold">Kezdés</h2>
          {t.status === "draft" && (
            <form action={openRegistration} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="slug" value={t.slug} />
              <p className="text-sm">A verseny még rejtett, a játékosok nem látják.</p>
              <SubmitButton>Jelentkezés megnyitása</SubmitButton>
            </form>
          )}
          <form action={updateStartTime} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="slug" value={t.slug} />
            <div>
              <label className="label" htmlFor="starts_at">
                Kezdési időpont {t.starts_at && <span className="muted">(most: {formatDateTime(t.starts_at, tz)})</span>}
                <InfoTip text="Üresen mentve nincs időzítés: kézzel indítod." />
              </label>
              <input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                className="input"
                defaultValue={t.starts_at ? utcToWallTime(new Date(t.starts_at), tz) : ""}
              />
            </div>
            <SubmitButton className="btn btn-secondary">Mentés</SubmitButton>
          </form>
          <form action={startTournamentNow} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="slug" value={t.slug} />
            <SubmitButton
              disabled={registrations.length < 2}
              confirm={`Elindítod most ${registrations.length} játékossal? A jelentkezés lezárul${t.auto_pairing ? ", és az 1. forduló párosítása kimegy Discordra" : ""}.`}
            >
              Indítás most
            </SubmitButton>
            {registrations.length < 2 && <span className="muted text-sm">Legalább 2 jelentkező kell.</span>}
          </form>
        </section>
      )}

      {beforeStart && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">
            Jelentkezők ({registrations.length})
            <InfoTip text="A hősöket csak az adminok látják a kezdésig. Kezdéskor mindenki bekerül, a nem véglegesítettek is." />
          </h2>
          {registrations.length === 0 ? (
            <p className="muted text-sm">Még nincs jelentkező.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl w-full text-sm">
                <thead>
                  <tr>
                    <th>Karnyx név</th>
                    <th>Hősök</th>
                    <th>Állapot</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.profile_id}>
                      <td>
                        <span className="flex items-center gap-2 font-medium">
                          <PlayerLink name={r.karnyx_name} decorative>
                            <PlayerAvatar name={r.karnyx_name} />
                          </PlayerLink>
                          <PlayerLink name={r.karnyx_name} />
                        </span>
                      </td>
                      <td>
                        <HeroIcons heroes={r.heroes} />
                      </td>
                      <td>{r.locked_at ? "🔒 véglegesítve" : <span className="muted">módosíthat</span>}</td>
                      <td className="text-right">
                        <form action={removeRegistration}>
                          <input type="hidden" name="slug" value={t.slug} />
                          <input type="hidden" name="profile_id" value={r.profile_id} />
                          <SubmitButton className="btn btn-danger btn-sm" confirm={`Eltávolítod ${r.karnyx_name} jelentkezését?`}>
                            Eltávolítás
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!beforeStart && (
        <EngineRoundSection tournament={t} players={players} rounds={rounds} allMatches={matches} tz={tz} back={back} />
      )}

      <details className="card">
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--danger)" }}>
          Verseny törlése
        </summary>
        <form action={deleteChampionship} className="mt-3 space-y-2">
          <input type="hidden" name="slug" value={t.slug} />
          <p className="text-sm">
            Véglegesen törli a(z) <strong>{t.name}</strong> versenyt a jelentkezésekkel, fordulókkal és eredményekkel együtt. Nem
            visszavonható.
          </p>
          <label className="label" htmlFor="confirm_name">Írd be a verseny nevét a megerősítéshez</label>
          <div className="flex flex-wrap gap-2">
            <input id="confirm_name" name="confirm_name" className="input max-w-sm" autoComplete="off" required />
            <SubmitButton className="btn btn-danger" confirm={`Biztosan véglegesen törlöd a(z) „${t.name}” versenyt?`}>
              Verseny törlése
            </SubmitButton>
          </div>
        </form>
      </details>
    </div>
  );
}
