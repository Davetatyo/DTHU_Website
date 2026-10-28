import Link from "next/link";
import { MatchList } from "@/components/MatchList";
import { MatchupGrid } from "@/components/MatchupGrid";
import { SubmitButton } from "@/components/SubmitButton";
import { InfoTip } from "@/components/InfoTip";
import { getReminderTargets } from "@/lib/notify";
import { requireAdmin } from "@/lib/auth";
import { getActiveTournament, getOpenProposalCounts, getPlayers, getRoundMatches, getRounds } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDateTime, utcToWallTime } from "@/lib/time";
import type { Profile } from "@/lib/types";
import {
  addAdmin,
  adminMarkPlayed,
  createTournament,
  deleteLatestRound,
  deleteTournament,
  releaseNickname,
  removeAdmin,
  sendReminder,
  testWebhook,
  updateDeadline,
} from "./actions";
import { ImportForm } from "./ImportForm";

const WEEK_MS = 7 * 24 * 3600_000;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; hiba?: string; nezet?: string }>;
}) {
  const { uzenet, hiba, nezet } = await searchParams;
  const listView = nezet === "lista";
  const me = await requireAdmin();
  const tz = me.timezone;
  const tournament = await getActiveTournament();
  const rounds = tournament ? await getRounds(tournament.id) : [];
  const round = rounds[0] ?? null;
  const matches = round ? await getRoundMatches(round.id) : [];
  const players = tournament ? await getPlayers(tournament.id) : [];
  const { data } = await createAdminClient().from("profiles").select("*").order("created_at");
  const profiles = (data ?? []) as Profile[];

  const claimed = new Set(profiles.flatMap((p) => (p.karnyx_name ? [p.karnyx_name.toLowerCase()] : [])));
  const rosterNames = new Set(players.map((p) => p.karnyx_name.toLowerCase()));
  const openProposals = listView ? new Map<string, number>() : await getOpenProposalCounts(matches.map((m) => m.id));
  const unregistered = players.filter((p) => !claimed.has(p.karnyx_name.toLowerCase()));
  const reminder = round && !round.closed_at ? await getReminderTargets(round.id) : null;
  const reminderPlayerCount = reminder
    ? reminder.unscheduled.length * 2 + reminder.awaitingAnswer.reduce((n, t) => n + t.responders.length, 0)
    : 0;
  const webhookConfigured = !!process.env.DISCORD_WEBHOOK_URL;
  const now = new Date();
  const awaitingPlayed = matches.filter((m) => m.status === "confirmed" && m.scheduled_at && new Date(m.scheduled_at) < now);
  const counts = {
    pending: matches.filter((m) => m.status === "pending").length,
    proposed: matches.filter((m) => m.status === "proposed").length,
    confirmed: matches.filter((m) => m.status === "confirmed").length,
    played: matches.filter((m) => m.status === "played").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      {tournament && round && reminder && (
        <section className="card flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--accent)" }}>
          <div>
            <h2 className="font-bold">
              Emlékeztető a {round.number}. fordulóhoz
              <InfoTip text="Discordon megjelöli mindkét játékost ott, ahol még nincs időpont-javaslat, és azt, akinek egy javaslatra kell válaszolnia. A nem regisztrált játékosok csak névvel szerepelnek. Küldés előtt megerősítést kér." />
            </h2>
            <p className="muted text-sm">
              {reminder.unscheduled.length} meccsnek nincs még időpont-javaslata, {reminder.awaitingAnswer.length} javaslat
              vár válaszra. A gomb Discordon megjelöli ezeket a játékosokat.
            </p>
            {!webhookConfigured && (
              <p className="mt-1 text-sm" style={{ color: "var(--danger)" }}>
                A Discord webhook nincs beállítva (DISCORD_WEBHOOK_URL), ezért most nem lehet küldeni.
              </p>
            )}
          </div>
          <form action={sendReminder}>
            <input type="hidden" name="tournament_id" value={tournament.id} />
            <SubmitButton
              confirm={`Discord emlékeztető küldése ${reminderPlayerCount} játékosnak?`}
              disabled={!webhookConfigured || reminderPlayerCount === 0}
            >
              ⏰ Emlékeztető küldése
            </SubmitButton>
          </form>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">Verseny</h2>
        {tournament ? (
          <p>
            Aktív verseny: <strong>{tournament.name}</strong> · {players.length} játékos · {rounds.length} forduló
          </p>
        ) : (
          <p className="muted">Még nincs aktív verseny. Hozz létre egyet!</p>
        )}
        <details open={!tournament}>
          <summary className="cursor-pointer text-sm font-semibold">Új verseny indítása</summary>
          <form action={createTournament} className="mt-3 flex flex-wrap gap-2">
            <input name="name" className="input max-w-sm" placeholder="pl. DT Online Liga 2026 ősz" required />
            <SubmitButton className="btn">Létrehozás</SubmitButton>
          </form>
          {tournament && <p className="muted mt-2 text-xs">Az új verseny lesz az aktív, a mostani archiválódik.</p>}
        </details>
        {tournament && (
          <details>
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--danger)" }}>
              Verseny törlése
            </summary>
            <form action={deleteTournament} className="mt-3 space-y-2">
              <input type="hidden" name="tournament_id" value={tournament.id} />
              <p className="text-sm">
                Véglegesen törli a(z) <strong>{tournament.name}</strong> versenyt: mind a {rounds.length} fordulót, a
                párosításokat, az időpont-javaslatokat és a játékoslistát. Nem visszavonható. A játékosok fiókja és
                Karnyx neve megmarad.
              </p>
              <p className="muted text-xs">Ha csak az utolsó forduló párosítása rossz, elég lent a „Forduló törlése”.</p>
              <label className="label" htmlFor="confirm_name">
                Írd be a verseny nevét a megerősítéshez
              </label>
              <div className="flex flex-wrap gap-2">
                <input id="confirm_name" name="confirm_name" className="input max-w-sm" autoComplete="off" required />
                <SubmitButton
                  confirm={`Biztosan véglegesen törlöd a(z) „${tournament.name}” versenyt?`}
                  className="btn btn-danger"
                >
                  Verseny törlése
                </SubmitButton>
              </div>
            </form>
          </details>
        )}
      </section>

      {tournament && (
        // While a round is still being played, keep the import collapsed; open it when the next round is due.
        <details className="card" open={!round || !!round.completed_at}>
          <summary className="cursor-pointer text-lg font-bold">
            Új forduló párosítása ({(round?.number ?? 0) + 1}. forduló)
            {round && !round.completed_at && (
              <span className="muted ml-2 text-sm font-normal">
                a {round.number}. forduló még tart, kattints a megnyitáshoz
              </span>
            )}
          </summary>
          <div className="mt-3">
            <ImportForm
              tournamentId={tournament.id}
              nextRound={(round?.number ?? 0) + 1}
              defaultDeadline={utcToWallTime(new Date(Date.now() + WEEK_MS), tz)}
              knownPlayers={players.map((p) => p.karnyx_name)}
            />
          </div>
        </details>
      )}

      {tournament && round && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">{round.number}. forduló állása</h2>
            {round.completed_at && <span className="badge badge-confirmed">Minden meccs lejátszva</span>}
          </div>
          <p className="text-sm">
            <span className="badge badge-pending">{counts.pending} nincs időpont</span>{" "}
            <span className="badge badge-proposed">{counts.proposed} javasolva</span>{" "}
            <span className="badge badge-confirmed">{counts.confirmed} megerősítve</span>{" "}
            <span className="badge badge-played">{counts.played} lejátszva</span>
          </p>
          <form action={updateDeadline} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="round_id" value={round.id} />
            <div>
              <label className="label" htmlFor="round-deadline">
                Határidő (most: {formatDateTime(round.deadline, tz)})
                <InfoTip text="Időpontot csak a határidőig lehet javasolni. A 48 órás automatikus figyelmeztetés az új határidőhöz igazodik." />
              </label>
              <input
                id="round-deadline"
                type="datetime-local"
                name="deadline"
                className="input"
                defaultValue={utcToWallTime(new Date(round.deadline), tz)}
                required
              />
            </div>
            <SubmitButton className="btn btn-secondary">Módosítás</SubmitButton>
          </form>
          {awaitingPlayed.length > 0 && (
            <div className="space-y-2 rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
              <div className="font-semibold">Elmúlt az időpont, lejátszásra vár ({awaitingPlayed.length})</div>
              {awaitingPlayed.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {m.a.karnyx_name} <span className="muted">vs</span> {m.b?.karnyx_name}
                    <span className="muted ml-2 text-sm">{formatDateTime(m.scheduled_at!, tz)}</span>
                  </span>
                  <form action={adminMarkPlayed}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <SubmitButton className="btn btn-sm">✓ Lejátszva</SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-1 text-sm">
            {[
              { label: "Kártyák", href: "/admin", active: !listView },
              { label: "Lista", href: "/admin?nezet=lista", active: listView },
            ].map((v) => (
              <Link
                key={v.label}
                href={v.href}
                className={`btn btn-sm ${v.active ? "" : "btn-secondary"}`}
                aria-current={v.active ? "page" : undefined}
              >
                {v.label}
              </Link>
            ))}
            <InfoTip text="Kártyák: minden meccs egy kártya, a színe az állapotot mutatja, a zöld pötty regisztrált játékost jelöl. Lista: tömör nézet egy sorban meccsenként." />
          </div>
          {listView ? (
            <MatchList matches={matches} timeZone={tz} />
          ) : (
            <MatchupGrid matches={matches} timeZone={tz} registeredNames={claimed} openProposalCounts={openProposals} />
          )}
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Hibás beillesztés? Forduló törlése</summary>
            <form action={deleteLatestRound} className="mt-3 flex flex-wrap items-center gap-3">
              <input type="hidden" name="tournament_id" value={tournament.id} />
              <label className="text-sm">
                <input type="checkbox" name="confirm" /> Biztosan törlöm a {round.number}. fordulót és minden
                egyeztetését
              </label>
              <SubmitButton className="btn btn-danger btn-sm">Törlés</SubmitButton>
            </form>
          </details>
        </section>
      )}

      {unregistered.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-bold">Még nem regisztrált játékosok ({unregistered.length})</h2>
          <p className="muted text-sm">Őket a Discord bot csak névvel tudja említeni, megjelölni nem.</p>
          <p className="mt-2">{unregistered.map((p) => p.karnyx_name).join(", ")}</p>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Felhasználók és adminok
          <InfoTip text="Adminná csak olyat tehetsz, aki már belépett az oldalra: keresd Discord vagy Karnyx név alapján. A Név felszabadítása akkor kell, ha valaki rossz Karnyx nevet foglalt le." />
        </h2>
        <form action={addAdmin} className="flex flex-wrap gap-2">
          <input name="query" className="input max-w-sm" placeholder="Discord vagy Karnyx név" required />
          <SubmitButton className="btn">Adminná teszem</SubmitButton>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="muted text-left">
                <th className="py-1 pr-2">Karnyx</th>
                <th className="py-1 pr-2">Facebook</th>
                <th className="py-1 pr-2">Discord</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-1.5 pr-2 font-medium">
                    {p.karnyx_name ?? <span className="muted">nem játszik</span>}
                    {p.karnyx_name && rosterNames.size > 0 && !rosterNames.has(p.karnyx_name.toLowerCase()) && (
                      <span className="badge badge-proposed ml-1" title="Egyedi név: még nem szerepel egy fordulóban sem">
                        egyedi
                      </span>
                    )}
                    {p.is_admin && <span className="badge badge-confirmed ml-1">admin</span>}
                  </td>
                  <td className="py-1.5 pr-2">{p.facebook_name ?? "—"}</td>
                  <td className="py-1.5 pr-2">{p.discord_username ?? "—"}</td>
                  <td className="flex flex-wrap justify-end gap-1 py-1.5">
                    {p.karnyx_name && (
                      <form action={releaseNickname}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <SubmitButton className="btn btn-secondary btn-sm">Név felszabadítása</SubmitButton>
                      </form>
                    )}
                    {p.is_admin && p.id !== me.id && (
                      <form action={removeAdmin}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <SubmitButton className="btn btn-danger btn-sm">Admin elvétele</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">Discord</h2>
        <p className="muted text-sm">
          Webhook: {process.env.DISCORD_WEBHOOK_URL ? "beállítva ✓" : "nincs beállítva (DISCORD_WEBHOOK_URL)"}
        </p>
        <form action={testWebhook}>
          <SubmitButton className="btn btn-secondary btn-sm">Teszt üzenet küldése</SubmitButton>
        </form>
      </section>
    </div>
  );
}
