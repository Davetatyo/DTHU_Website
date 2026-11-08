import type { Metadata } from "next";
import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { getActiveTournament, getPlayers, getRoundMatches, getRounds } from "@/features/match-organizer/lib/data";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import type { Profile } from "@/features/match-organizer/lib/types";
import { addBoost, adjustXp, awardTournament, removeBoost, saveActivities, saveCurve } from "@/features/xp/actions/admin";
import { getActivities, getBoosts, getCurve, getXpHistory, getXpTotal } from "@/features/xp/lib/data";
import { tournamentFinishers } from "@/features/xp/lib/finishers";
import { levelInfo, levelStart } from "@/features/xp/lib/levels";
import { XP_ADMINS_ONLY } from "@/features/xp/lib/rules";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "XP kezelés" };

export default async function AdminXpPage({ searchParams }: { searchParams: Promise<{ uzenet?: string; hiba?: string; user?: string }> }) {
  const { uzenet, hiba, user } = await searchParams;
  const me = await requireAdmin();
  const tz = me.timezone;
  const [{ ready, rows: activities }, curve, boosts, tournament] = await Promise.all([getActivities(), getCurve(), getBoosts(), getActiveTournament()]);
  const { data: profileRows } = await createAdminClient().from("profiles").select("id, karnyx_name, display_name, discord_username").order("karnyx_name");
  const profiles = (profileRows ?? []) as Pick<Profile, "id" | "karnyx_name" | "display_name" | "discord_username">[];
  const nameOf = (p: (typeof profiles)[number]) => p.karnyx_name ?? p.display_name ?? p.discord_username ?? "?";
  const selected = profiles.find((p) => p.id === user) ?? null;
  const [history, total] = selected ? await Promise.all([getXpHistory(selected.id, 100), getXpTotal(selected.id)]) : [[], 0];

  const rounds = tournament ? await getRounds(tournament.id) : [];
  const players = tournament ? await getPlayers(tournament.id) : [];
  const matches = (await Promise.all(rounds.map((r) => getRoundMatches(r.id)))).flat();
  const finish = tournamentFinishers(
    rounds.map((r) => r.id),
    matches.map((m) => ({ round_id: m.round_id, status: m.status, a: m.a.karnyx_name, b: m.b?.karnyx_name ?? null })),
  );
  const openRounds = rounds.filter((r) => !r.completed_at).length;
  const activityName = new Map(activities.map((a) => [a.key, a.name]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={routes.admin} className="muted text-sm hover:text-[var(--fg)]">
        ← Admin felület
      </Link>
      <div className="sec-h">
        <h1>XP kezelés</h1>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}
      {!ready && <p className="alert-error">Még nem futott le a 0012-es migráció: amíg nem fut le, itt semmi sem menthető, és senki nem kap XP-t.</p>}
      {XP_ADMINS_ONLY && (
        <p className="alert-info">
          Tesztüzem: az XP-t egyelőre csak az adminok látják. A teljes oldal nyitásakor minden teszt XP törlődik, és mindenki 0. szintről indul.
        </p>
      )}

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Kézi XP
          <InfoTip text="Adj vagy vonj le XP-t egy játékostól, például élő eseményért. Az okot a játékos is látja. Az összes XP nem mehet nulla alá." />
        </h2>
        <form action={adjustXp} className="grid gap-2 sm:grid-cols-[1fr_7rem]">
          <select name="profile_id" className="input" defaultValue={selected?.id ?? ""} required aria-label="Felhasználó">
            <option value="">Válassz felhasználót…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {nameOf(p)}
              </option>
            ))}
          </select>
          <input name="amount" type="number" step={5} className="input" placeholder="+50 vagy -25" aria-label="XP" required />
          <input name="reason" className="input sm:col-span-2" placeholder="Ok, pl. Élő esemény: Budapest, november" maxLength={200} aria-label="Ok" required />
          <SubmitButton className="btn sm:col-span-2">Mentés</SubmitButton>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Verseny XP kiosztása
          <InfoTip text="A verseny végén: 30 XP mindenkinek, aki minden fordulóban játszott vagy Bye-ja volt, a Bye-okért a meccs XP, és a dobogós XP. A lejátszott meccsek XP-je magától jár. Újra megnyomva sem ad semmit kétszer." />
        </h2>
        {!tournament ? (
          <p className="muted text-sm">Nincs aktív verseny.</p>
        ) : (
          <form action={awardTournament} className="space-y-3">
            <input type="hidden" name="tournament_id" value={tournament.id} />
            <p className="text-sm">
              <b>{tournament.name}</b> · {rounds.length} forduló{openRounds ? ` (${openRounds} még nincs kész)` : ""} · eddig{" "}
              <b>{finish.finishers.length}</b> befejező, {finish.byes.length} Bye
            </p>
            {finish.finishers.length > 0 && <p className="muted text-sm">Befejezők: {finish.finishers.join(", ")}</p>}
            <div className="grid gap-2 sm:grid-cols-3">
              {[1, 2, 3].map((place) => (
                <label key={place} className="text-sm">
                  <span className="label">{place}. hely</span>
                  <select name={`place_${place}`} className="input" defaultValue="">
                    <option value="">Nincs</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.karnyx_name}>
                        {p.karnyx_name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <SubmitButton className="btn" confirm={openRounds ? "Van még be nem fejezett forduló. Biztosan most osztod ki?" : "Kiosztod a verseny XP-jét?"}>
              Kiosztás
            </SubmitButton>
          </form>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Tevékenységek
          <InfoTip text="Mennyi XP jár egy tevékenységért, és be van-e kapcsolva. Csak mostantól számít: a már megkapott XP nem változik. Új tevékenység csak kódváltozással jön." />
        </h2>
        <form action={saveActivities} className="space-y-2">
          {activities.map((a) => (
            <div key={a.key} className="flex items-center gap-3">
              <input type="checkbox" name={`active_${a.key}`} defaultChecked={a.active} aria-label={`${a.name} bekapcsolva`} />
              <span className="flex-1 text-sm">{a.name}</span>
              <input name={`amount_${a.key}`} type="number" min={0} max={1000} step={5} defaultValue={a.amount} className="input w-24" aria-label={`${a.name} XP`} />
              <span className="muted text-sm">XP</span>
            </div>
          ))}
          <SubmitButton className="btn btn-secondary">Mentés</SubmitButton>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Szintgörbe
          <InfoTip text="A 0 → 1. szint ennyi XP, és minden szint ennyivel többe kerül, mint az előző. Megegyezett érték: 25 és +20 (20. szint = 4300 XP)." />
        </h2>
        <form action={saveCurve} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="label">Első szint</span>
            <input name="first" type="number" min={5} max={500} step={5} defaultValue={curve.first} className="input w-28" />
          </label>
          <label className="text-sm">
            <span className="label">Szintenként +</span>
            <input name="step" type="number" min={5} max={500} step={5} defaultValue={curve.step} className="input w-28" />
          </label>
          <SubmitButton className="btn btn-secondary" confirm="A szintgörbe mindenkinél azonnal átszámolja a szintet (az XP nem változik). Mented?">
            Mentés
          </SubmitButton>
        </form>
        <p className="muted text-sm">
          Most: 5. szint {levelStart(5, curve)} XP · 10. szint {levelStart(10, curve)} XP · 20. szint {levelStart(20, curve)} XP
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Dupla XP
          <InfoTip text="Egy versenyre: annak minden XP-je (meccsek, befejezés, dobogó) dupla, akármikor kapják. Vagy egy időszakra a kiválasztott tevékenységekre (ha egyet sem jelölsz, mindre)." />
        </h2>
        {boosts.length === 0 && <p className="muted text-sm">Nincs beállítva.</p>}
        {boosts.map((b) => (
          <form key={b.id} action={removeBoost} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <input type="hidden" name="id" value={b.id} />
            <span>
              <b>{b.multiplier}×</b>{" "}
              {b.tournament_id
                ? `verseny: ${b.tournament_id === tournament?.id ? tournament.name : "korábbi verseny"}`
                : `${formatDateTime(b.starts_at!, tz)} – ${formatDateTime(b.ends_at!, tz)} · ${b.activity_keys?.map((k) => activityName.get(k) ?? k).join(", ") ?? "minden tevékenység"}`}
              {b.note && <span className="muted"> · {b.note}</span>}
            </span>
            <SubmitButton className="btn btn-secondary btn-sm" confirm="Törlöd ezt a dupla XP-t?">
              Törlés
            </SubmitButton>
          </form>
        ))}
        <form action={addBoost} className="space-y-2 border-t pt-3" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="mode" value="window" defaultChecked /> Időszak
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="mode" value="tournament" disabled={!tournament} /> Az aktív verseny{tournament ? `: ${tournament.name}` : ""}
            </label>
            <select name="multiplier" className="input w-24" defaultValue="2" aria-label="Szorzó">
              <option value="2">2×</option>
              <option value="3">3×</option>
            </select>
          </div>
          {tournament && <input type="hidden" name="tournament_id" value={tournament.id} />}
          <div className="flex flex-wrap gap-2">
            <input name="starts_at" type="datetime-local" className="input w-auto" aria-label="Kezdete" />
            <input name="ends_at" type="datetime-local" className="input w-auto" aria-label="Vége" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {activities.map((a) => (
              <label key={a.key} className="flex items-center gap-1.5">
                <input type="checkbox" name="activity" value={a.key} /> {a.name}
              </label>
            ))}
          </div>
          <input name="note" className="input" placeholder="Megjegyzés, pl. Játékhét" maxLength={200} aria-label="Megjegyzés" />
          <SubmitButton className="btn btn-secondary">Dupla XP hozzáadása</SubmitButton>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">Egy felhasználó XP-je</h2>
        <form className="flex gap-2">
          <select name="user" className="input" defaultValue={selected?.id ?? ""} aria-label="Felhasználó">
            <option value="">Válassz felhasználót…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {nameOf(p)}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary">Mutasd</button>
        </form>
        {selected && (
          <>
            <p className="text-sm">
              <b>{nameOf(selected)}</b>: {total} XP · {levelInfo(total, curve).level}. szint
            </p>
            {history.length === 0 && <p className="muted text-sm">Még nincs XP-je.</p>}
            <ul className="space-y-1 text-sm">
              {history.map((e) => (
                <li key={e.id} className="flex justify-between gap-3">
                  <span>
                    {e.label}
                    {e.multiplier > 1 && <span className="muted"> ({e.multiplier}×)</span>}
                  </span>
                  <span className="muted whitespace-nowrap">
                    {formatDateTime(e.created_at, tz)} · <b style={{ color: e.amount > 0 ? "var(--ok-solid)" : "var(--danger)" }}>{e.amount > 0 ? `+${e.amount}` : e.amount}</b>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
