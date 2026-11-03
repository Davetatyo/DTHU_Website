import type { Metadata } from "next";
import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateTime, utcToWallTime } from "@/features/match-organizer/lib/time";
import { awardPodium, awardTickets, cancelDraw, createDraw, drawNow } from "@/features/tickets/actions/draws";
import { LedgerList } from "@/features/tickets/components/LedgerList";
import { getAllBalances, getDraws, getLedger, profileName, TicketsNotReady } from "@/features/tickets/lib/data";
import { drawPhase } from "@/features/tickets/lib/draw";
import { loadDrawStats } from "@/features/tickets/lib/stats";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import "@/features/tickets/tickets.css";

export const metadata: Metadata = { title: "Sorsolások kezelése" };

const MONTH_MS = 30 * 24 * 3600_000;
const PODIUM = [
  { place: 1, amount: 3 },
  { place: 2, amount: 2 },
  { place: 3, amount: 1 },
];

export default async function TicketAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const { uzenet, hiba } = await searchParams;
  const me = await requireAdmin();
  const tz = me.timezone;
  const { data: profileRows } = await createAdminClient().from("profiles").select("*");
  const profiles = ((profileRows ?? []) as Profile[]).sort((a, b) =>
    profileName(a).localeCompare(profileName(b), "hu"),
  );
  const names = new Map(profiles.map((p) => [p.id, profileName(p)]));

  let data;
  try {
    const draws = await getDraws();
    const [stats, balances, ledger] = await Promise.all([
      loadDrawStats(draws, null),
      getAllBalances(),
      getLedger(null, 50),
    ]);
    data = { draws, stats, balances, ledger };
  } catch (err) {
    if (!(err instanceof TicketsNotReady)) throw err;
    data = null;
  }

  const options = profiles.map((p) => (
    <option key={p.id} value={p.id}>
      {profileName(p)}
      {p.karnyx_name && p.display_name ? ` (${p.display_name})` : ""} · {data?.balances.get(p.id) ?? 0} jegy
    </option>
  ));
  const holders = profiles
    .map((p) => ({ id: p.id, name: profileName(p), balance: data?.balances.get(p.id) ?? 0 }))
    .filter((h) => h.balance !== 0)
    .sort((a, b) => b.balance - a.balance);
  const active = data?.draws.filter((d) => d.status === "open") ?? [];

  return (
    <div className="space-y-6">
      <div className="sec-h">
        <h1>Sorsolások kezelése</h1>
        <Link href={routes.tickets} className="btn btn-secondary btn-sm">
          Vissza a sorsoláshoz
        </Link>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}
      {!data && (
        <p className="alert-error">
          Futtasd le a supabase/migrations/0007_ticket_draws.sql fájlt a Supabase SQL Editorban, addig itt semmi sem
          működik.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">
            Dobogó jutalmazása
            <InfoTip text="Egy verseny (online vagy élő) 1–3. helyezettje egyszerre. Az üresen hagyott hely kimarad. A játékosnak egyszer be kell lépnie az oldalra, hogy a listában legyen." />
          </h2>
          <form action={awardPodium} className="space-y-2">
            <label className="label" htmlFor="podium-event">
              Verseny
            </label>
            <input id="podium-event" name="event" className="input" placeholder="pl. DT Online Liga 2026 ősz" required />
            {PODIUM.map(({ place, amount }) => (
              <div key={place} className="flex gap-2">
                <select name={`place${place}`} className="input" aria-label={`${place}. hely`} defaultValue="">
                  <option value="">{place}. hely: válassz játékost…</option>
                  {options}
                </select>
                <input
                  name={`amount${place}`}
                  type="number"
                  min={1}
                  defaultValue={amount}
                  className="input w-20"
                  aria-label={`${place}. hely jegyei`}
                />
              </div>
            ))}
            <SubmitButton>Jegyek jóváírása</SubmitButton>
          </form>
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg font-bold">
            Jegy jóváírása vagy levonása
            <InfoTip text="Egyedi könyvelés: pl. egy helyezés, ami nem fér a dobogó űrlapba, vagy javítás. Negatív számmal jegyet vonsz le; az egyenleg nem mehet nulla alá." />
          </h2>
          <form action={awardTickets} className="space-y-2">
            <label className="label" htmlFor="award-profile">
              Játékos
            </label>
            <select id="award-profile" name="profile_id" className="input" defaultValue="" required>
              <option value="" disabled>
                Válassz játékost…
              </option>
              {options}
            </select>
            <div className="flex gap-2">
              <div className="w-24 shrink-0">
                <label className="label" htmlFor="award-amount">
                  Jegy
                </label>
                <input id="award-amount" name="amount" type="number" defaultValue={2} className="input" required />
              </div>
              <div className="flex-1">
                <label className="label" htmlFor="award-reason">
                  Indok
                </label>
                <input
                  id="award-reason"
                  name="reason"
                  className="input"
                  list="award-reasons"
                  placeholder="pl. Budapesti élő verseny · 1. hely"
                  required
                />
                <datalist id="award-reasons">
                  <option value="Élő verseny · 1. hely" />
                  <option value="Élő verseny · 2. hely" />
                  <option value="Élő verseny · 3. hely" />
                  <option value="Javítás" />
                </datalist>
              </div>
            </div>
            <SubmitButton>Könyvelés</SubmitButton>
          </form>
        </section>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Új sorsolás
          <InfoTip text="A zárás időpontjáig lehet nevezni. Utána a sorsolás automatikusan lefut (óránkénti ellenőrzés), a nyerteseket Discordon is kihirdeti. A jegyek súlyozzák az esélyt, egy játékos legfeljebb egyszer nyer." />
        </h2>
        <form action={createDraw} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="draw-title">
              Cím
            </label>
            <input id="draw-title" name="title" className="input" placeholder="pl. Téli sorsolás 2026" required />
          </div>
          <div>
            <label className="label" htmlFor="draw-prize">
              Nyeremény
            </label>
            <input id="draw-prize" name="prize" className="input" placeholder="pl. Dice Throne promó kártya" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="draw-desc">
              Leírás (nem kötelező)
            </label>
            <textarea id="draw-desc" name="description" className="input" rows={2} />
          </div>
          <div>
            <label className="label" htmlFor="draw-closes">
              Nevezés zárása ({tz})
            </label>
            <input
              id="draw-closes"
              name="closes_at"
              type="datetime-local"
              className="input"
              defaultValue={utcToWallTime(new Date(Date.now() + MONTH_MS), tz)}
              required
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label" htmlFor="draw-winners">
                Nyertesek száma
              </label>
              <input id="draw-winners" name="winner_count" type="number" min={1} max={100} defaultValue={1} className="input" required />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="draw-cap">
                Max. jegy/fő
                <InfoTip text="Hány jegyet tehet be egy játékos legfeljebb. Üresen hagyva nincs korlát." />
              </label>
              <input id="draw-cap" name="max_tickets" type="number" min={1} className="input" placeholder="nincs" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Sorsolás létrehozása</SubmitButton>
          </div>
        </form>
      </section>

      {active.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">Nyitott sorsolások</h2>
          <ul className="space-y-3">
            {active.map((d) => {
              const s = data!.stats.get(d.id)!;
              return (
                <li key={d.id} className="panel3 flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <b>{d.title}</b> · {d.prize}
                    <p className="muted text-sm">
                      {drawPhase(d) === "closing" ? "Lezárult" : "Zárás"}: {formatDateTime(d.closes_at, tz)} ·{" "}
                      {s.entrants} játékos, {s.tickets} jegy · {d.winner_count} nyertes
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={drawNow}>
                      <input type="hidden" name="draw_id" value={d.id} />
                      <SubmitButton
                        className="btn btn-sm"
                        confirm={`Lezárod a nevezést és most kisorsolod: „${d.title}”? Az eredmény Discordon is megjelenik.`}
                      >
                        Sorsolás most
                      </SubmitButton>
                    </form>
                    <form action={cancelDraw}>
                      <input type="hidden" name="draw_id" value={d.id} />
                      <SubmitButton
                        className="btn btn-danger btn-sm"
                        confirm={`Törlöd a(z) „${d.title}” sorsolást? Mindenki visszakapja a betett jegyeit.`}
                      >
                        Elmarad
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {data && (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <section className="space-y-2">
            <div className="hh">
              <h2>Egyenlegek</h2>
            </div>
            {holders.length === 0 ? (
              <p className="muted text-sm">Még senkinek nincs jegye.</p>
            ) : (
              <ul className="panel3 ledger">
                {holders.map((h) => (
                  <li key={h.id}>
                    <span className="flex-1">{h.name}</span>
                    <b>{h.balance}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-2">
            <div className="hh">
              <h2>Legutóbbi jegymozgások</h2>
            </div>
            <LedgerList rows={data.ledger} timeZone={tz} names={names} />
          </section>
        </div>
      )}
    </div>
  );
}
