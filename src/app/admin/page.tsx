import { MatchList } from "@/components/MatchList";
import { requireAdmin } from "@/lib/auth";
import { getActiveTournament, getPlayers, getRoundMatches, getRounds } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDateTime, utcToWallTime } from "@/lib/time";
import type { Profile } from "@/lib/types";
import {
  addAdmin,
  createTournament,
  deleteLatestRound,
  releaseNickname,
  removeAdmin,
  testWebhook,
  updateDeadline,
} from "./actions";
import { ImportForm } from "./ImportForm";

const WEEK_MS = 7 * 24 * 3600_000;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ uzenet?: string; hiba?: string }> }) {
  const { uzenet, hiba } = await searchParams;
  const me = await requireAdmin();
  const tz = me.timezone;
  const tournament = await getActiveTournament();
  const rounds = tournament ? await getRounds(tournament.id) : [];
  const round = rounds[0] ?? null;
  const matches = round ? await getRoundMatches(round.id) : [];
  const players = tournament ? await getPlayers(tournament.id) : [];
  const { data } = await createAdminClient().from("profiles").select("*").order("created_at");
  const profiles = (data ?? []) as Profile[];

  const claimed = new Set(profiles.map((p) => p.karnyx_name?.toLowerCase()).filter(Boolean));
  const unregistered = players.filter((p) => !claimed.has(p.karnyx_name.toLowerCase()));
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
            <button className="btn">Létrehozás</button>
          </form>
          {tournament && <p className="muted mt-2 text-xs">Az új verseny lesz az aktív, a mostani archiválódik.</p>}
        </details>
      </section>

      {tournament && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">Új forduló párosítása</h2>
          <ImportForm
            tournamentId={tournament.id}
            nextRound={(round?.number ?? 0) + 1}
            defaultDeadline={utcToWallTime(new Date(Date.now() + WEEK_MS), tz)}
            knownPlayers={players.map((p) => p.karnyx_name)}
          />
        </section>
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
            <button className="btn btn-secondary">Módosítás</button>
          </form>
          <MatchList matches={matches} timeZone={tz} />
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Hibás beillesztés? Forduló törlése</summary>
            <form action={deleteLatestRound} className="mt-3 flex flex-wrap items-center gap-3">
              <input type="hidden" name="tournament_id" value={tournament.id} />
              <label className="text-sm">
                <input type="checkbox" name="confirm" /> Biztosan törlöm a {round.number}. fordulót és minden
                egyeztetését
              </label>
              <button className="btn btn-danger btn-sm">Törlés</button>
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
        <h2 className="text-lg font-bold">Felhasználók és adminok</h2>
        <form action={addAdmin} className="flex flex-wrap gap-2">
          <input name="query" className="input max-w-sm" placeholder="Discord vagy Karnyx név" required />
          <button className="btn">Adminná teszem</button>
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
                    {p.karnyx_name ?? <span className="muted">—</span>}
                    {p.is_admin && <span className="badge badge-confirmed ml-1">admin</span>}
                  </td>
                  <td className="py-1.5 pr-2">{p.facebook_name ?? "—"}</td>
                  <td className="py-1.5 pr-2">{p.discord_username ?? "—"}</td>
                  <td className="flex flex-wrap justify-end gap-1 py-1.5">
                    {p.karnyx_name && (
                      <form action={releaseNickname}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <button className="btn btn-secondary btn-sm">Név felszabadítása</button>
                      </form>
                    )}
                    {p.is_admin && p.id !== me.id && (
                      <form action={removeAdmin}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <button className="btn btn-danger btn-sm">Admin elvétele</button>
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
          <button className="btn btn-secondary btn-sm">Teszt üzenet küldése</button>
        </form>
      </section>
    </div>
  );
}
