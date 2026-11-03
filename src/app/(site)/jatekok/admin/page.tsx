import type { Metadata } from "next";
import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { saveSettings } from "@/features/games/actions/daily-admin";
import { SpinTableEditor } from "@/features/games/components/SpinTableEditor";
import { budapestDay, weekdayIndex } from "@/features/games/lib/daily";
import { recentAudit, upcomingCalendar } from "@/features/games/lib/daily-admin-data";
import { DailyNotReady } from "@/features/games/lib/daily-data";
import { formatDay } from "@/features/match-organizer/lib/time";
import { QUESTION_TYPE_LABEL, QUESTION_TYPES } from "@/features/shop/lib/economy";
import { loadEconomy } from "@/features/shop/lib/economy-store";
import { getProfilesById, profileName } from "@/features/tickets/lib/data";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/games/daily.css";
import "@/features/tickets/tickets.css";

export const metadata: Metadata = { title: "Napi játékok kezelése" };

const WEEKDAYS = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
const ACTION_LABEL: Record<string, string> = {
  config_set: "Beállítás",
  question_create: "Új kérdés",
  question_update: "Kérdés szerkesztése",
  question_archive: "Kérdés archiválása",
  question_schedule: "Ütemezés",
  question_unschedule: "Ütemezés törlése",
};

export default async function GamesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const { uzenet, hiba } = await searchParams;
  await requireAdmin();
  const e = await loadEconomy();
  const today = budapestDay();

  let data;
  try {
    const [calendar, audit] = await Promise.all([upcomingCalendar(today, 14), recentAudit(30)]);
    const actors = await getProfilesById(audit.flatMap((a) => (a.actor_id ? [a.actor_id] : [])));
    data = { calendar, audit, actors };
  } catch (err) {
    if (!(err instanceof DailyNotReady)) throw err;
    data = null;
  }
  const gaps = data?.calendar.slice(0, 7).filter((d) => !d.fixed && !d.scheduled) ?? [];

  return (
    <div className="space-y-6">
      <div className="sec-h">
        <h1>Napi játékok kezelése</h1>
        <Link href={routes.questionBank} className="btn btn-sm">
          Kérdésbank
        </Link>
        <Link href={routes.games} className="btn btn-secondary btn-sm">
          Vissza
        </Link>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}
      {!data && (
        <p className="alert-error">
          Futtasd le a supabase/migrations/0010_daily_spin_and_question.sql fájlt (a 0009 után) a Supabase SQL Editorban,
          addig itt semmi sem működik.
        </p>
      )}

      {data && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">
            Következő 14 nap
            <InfoTip text="Kattints egy napra, és a kérdésbankból válassz neki kérdést. Az aznapi kérdés az első megnyitáskor rögzül; ha nincs ütemezve, és a tartalék be van kapcsolva, a legrégebben használt kész kérdés jön (a nap típusát előnyben részesítve)." />
          </h2>
          {gaps.length > 0 && (
            <p className="alert-error">
              A következő 7 napból {gaps.length} napra nincs kérdés ütemezve
              {e.dailyFallbackEnabled ? " (ezeken a tartalékból választ a rendszer, ha van kész kérdés)." : ", és a tartalék ki van kapcsolva: ezeken a napokon nem lesz kérdés."}
            </p>
          )}
          <ul className="panel3 ledger">
            {data.calendar.map((d) => {
              const q = d.fixed ?? d.scheduled;
              const wd = weekdayIndex(d.day);
              return (
                <li key={d.day}>
                  <span className="w-36 shrink-0">
                    <b>{formatDay(`${d.day}T12:00:00Z`)}</b>
                    <span className="muted block text-xs">{QUESTION_TYPE_LABEL[e.dailyTypeSchedule[wd]]}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    {q ? (
                      <Link href={routes.questionEdit(q.id)} className="break-words">
                        {q.prompt.length > 90 ? `${q.prompt.slice(0, 90)}…` : q.prompt}
                      </Link>
                    ) : (
                      <span className="muted">nincs ütemezve</span>
                    )}
                    {d.fixed && <span className="chip ok ml-2">kiosztva</span>}
                  </span>
                  {!d.fixed && (
                    <Link href={`${routes.questionBank}?datum=${d.day}`} className="btn btn-secondary btn-sm shrink-0">
                      {q ? "Csere" : "Kérdés erre a napra"}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <form action={saveSettings} className="card space-y-5">
        <h2 className="text-lg font-bold">
          Beállítások
          <InfoTip text="Minden érték az admin felületről állítható, és csak a jövőbeli eseményekre hat: a korábbi coinmozgások nem változnak. Minden változás bekerül a naplóba." />
        </h2>

        <div className="space-y-2">
          <h3 className="font-bold">Szerencsekerék nyereménytáblája</h3>
          <SpinTableEditor initial={e.spinTable} maxEv={e.maxSpinEv} />
          <div className="w-60">
            <label className="label" htmlFor="max-ev">
              Várható érték figyelmeztetési határa
              <InfoTip text="Ha a kerék átlagos nyereménye (coin / pörgetés) e fölé megy, figyelmeztetést kapsz. Menteni ettől még lehet." />
            </label>
            <input id="max-ev" name="max_spin_ev" className="input" inputMode="decimal" defaultValue={e.maxSpinEv} required />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="reward-normal">
              Napi kvíz: normál kérdés jutalma
            </label>
            <input id="reward-normal" name="reward_normal" type="number" min={0} className="input" defaultValue={e.dailyRewardNormal} required />
          </div>
          <div>
            <label className="label" htmlFor="reward-hard">
              Napi kvíz: nehéz kérdés jutalma
            </label>
            <input id="reward-hard" name="reward_hard" type="number" min={0} className="input" defaultValue={e.dailyRewardHard} required />
          </div>
          <div>
            <label className="label" htmlFor="ticket-price">
              Sorsolási jegy ára a Boltban
            </label>
            <input id="ticket-price" name="ticket_price" type="number" min={1} className="input" defaultValue={e.ticketPrice} required />
          </div>
          <div>
            <label className="label" htmlFor="streak-length">
              Sorozat hossza (nap)
            </label>
            <input id="streak-length" name="streak_length" type="number" min={1} max={365} className="input" defaultValue={e.streakLengthDays} required />
          </div>
          <div>
            <label className="label" htmlFor="streak-bonus">
              Sorozat bónusza (coin)
            </label>
            <input id="streak-bonus" name="streak_bonus" type="number" min={0} className="input" defaultValue={e.streakBonusCoins} required />
          </div>
          <label className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" name="fallback" defaultChecked={e.dailyFallbackEnabled} />
            <span className="text-sm font-bold">Tartalék kérdés, ha egy napra nincs ütemezve</span>
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold">
            Heti beosztás
            <InfoTip text="Melyik napra milyen típusú kérdést válasszon a tartalék, ha nincs ütemezett kérdés. A „Kinek a képe?” típus még nem elérhető: azokon a napokon bármilyen kész kérdés jöhet." />
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {WEEKDAYS.map((w, i) => (
              <label key={w} className="text-sm">
                <span className="label">{w}</span>
                <select name={`schedule${i}`} className="input" defaultValue={e.dailyTypeSchedule[i]}>
                  {QUESTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-60 flex-1">
            <label className="label" htmlFor="reason">
              Indok (a naplóba, nem kötelező)
            </label>
            <input id="reason" name="reason" className="input" maxLength={300} placeholder="pl. kevesebb coin a keréken" />
          </div>
          <SubmitButton confirm="Elmented a beállításokat? Az új értékek azonnal érvényesek a következő pörgetésekre, válaszokra és vásárlásokra.">
            Beállítások mentése
          </SubmitButton>
        </div>
      </form>

      {data && (
        <section className="space-y-2">
          <div className="hh">
            <h2>Napló</h2>
          </div>
          {data.audit.length === 0 ? (
            <p className="muted text-sm">Még nincs bejegyzés.</p>
          ) : (
            <ul className="panel3 ledger">
              {data.audit.map((a) => (
                <li key={a.id}>
                  <span className="min-w-0 flex-1">
                    <b className="mr-1">{a.actor_id ? profileName(data.actors.get(a.actor_id)) : "?"}</b>
                    {ACTION_LABEL[a.action] ?? a.action}
                    {a.entity_type === "economy_config" && <code className="ml-1 text-xs">{a.entity_id}</code>}
                    {a.action === "config_set" && (
                      <span className="muted block break-words text-xs">
                        {a.before == null ? "alapérték" : JSON.stringify(a.before)} → {JSON.stringify(a.after)}
                      </span>
                    )}
                    {a.reason && <span className="muted block text-xs">Indok: {a.reason}</span>}
                  </span>
                  <span className="muted shrink-0 text-xs">{new Date(a.created_at).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
