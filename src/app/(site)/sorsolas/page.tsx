import type { Metadata } from "next";
import Link from "next/link";
import { Art } from "@/components/Art";
import type { IconId } from "@/components/Icon";
import { DrawCard } from "@/features/tickets/components/DrawCard";
import { EARN } from "@/features/tickets/data/earn";
import { getBalance, getDraws, TicketsNotReady } from "@/features/tickets/lib/data";
import { drawPhase } from "@/features/tickets/lib/draw";
import { loadDrawStats } from "@/features/tickets/lib/stats";
import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/tickets/tickets.css";

export const metadata: Metadata = { title: "Sorsolás" };

const ICONS: IconId[] = ["trophy", "trophy", "trophy"];
// Gold, silver, bronze.
const COLORS = ["#d4ab52", "#9aa3ad", "#b0703c"];

export default async function TicketDrawPage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const { uzenet, hiba } = await searchParams;
  const viewer = await getCurrentProfile();
  const adminView = await getAdminView();
  const tz = viewer?.timezone;

  let data;
  try {
    const draws = await getDraws();
    // Players see only their balance; the ticket history (ledger) is for admins (/sorsolas/admin).
    const [stats, balance] = await Promise.all([
      loadDrawStats(draws, viewer?.id ?? null),
      viewer ? getBalance(viewer.id) : Promise.resolve(null),
    ]);
    data = { draws, stats, balance };
  } catch (err) {
    if (!(err instanceof TicketsNotReady)) throw err;
    data = null;
  }

  const active = data?.draws.filter((d) => ["open", "closing"].includes(drawPhase(d))).reverse() ?? [];
  const past = data?.draws.filter((d) => !["open", "closing"].includes(drawPhase(d))) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="sec-h">
          <h1>Sorsolás</h1>
          {adminView && (
            <Link href={routes.ticketsAdmin} className="btn btn-admin btn-sm">
              Sorsolások kezelése
            </Link>
          )}
        </div>
        <p className="lead">
          Jegyet a versenyek dobogósai kapnak. Az év során több sorsolás is lesz: annyi jeggyel nevezel,
          amennyivel szeretnél, és minden jegy egy esély a nyereményre.
        </p>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}
      {!data && (
        <p className="alert-error">
          A sorsolás adatbázisa még nincs beállítva (supabase/migrations/0008_ticket_draws.sql). Amíg nem fut le, ez az
          oldal üres.
        </p>
      )}

      <div className="tile wallettile">
        <Art spec={{ c1: "#e0b24a", c2: "#7a2fb0", g: "ticket", prompt: "magic wallet overflowing with glowing golden tickets, fantasy UI hero image" }} />
        <div className="in">
          {viewer ? (
            <>
              <span className="k">{viewer.karnyx_name ?? viewer.display_name} egyenlege</span>
              <div className="big">{data?.balance ?? 0}</div>
              <span className="sub">jegy · nevezz vele egy sorsolásra lent</span>
            </>
          ) : (
            <>
              <span className="k">Sorsolás</span>
              <h3 className="text-3xl">Gyűjts jegyet, nevezz, nyerj</h3>
              <Link href={routes.login} className="btn btn-discord self-start">
                Belépés Discorddal
              </Link>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="rowh">
          <h2>Aktuális sorsolások</h2>
        </div>
        {active.length === 0 ? (
          <p className="muted">Most nincs nyitott sorsolás. Gyűjtsd a jegyeidet a következőre!</p>
        ) : (
          <div className="draw-grid">
            {active.map((d) => (
              <DrawCard key={d.id} draw={d} stats={data!.stats.get(d.id)!} balance={data!.balance} timeZone={tz} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="rowh">
          <h2>Így szerzel jegyet</h2>
        </div>
        <p className="lead">Egyelőre a versenyek dobogósai kapnak jegyet, online és élő versenyeken is. A jegyeket a szervezők írják jóvá a verseny után.</p>
        <div className="cards sm">
          {EARN.map(([t, n], i) => (
            <div key={t} className="tile earn">
              <Art spec={{ c1: COLORS[i], c2: "#15131c", g: ICONS[i], prompt: t }} />
              <div className="in">
                <span className="plus">{n}</span>
                <span className="sub" style={{ color: "#f4ecda" }}>
                  {t}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <div className="rowh">
            <h2>Korábbi sorsolások</h2>
          </div>
          <div className="draw-grid">
            {past.map((d) => (
              <DrawCard key={d.id} draw={d} stats={data!.stats.get(d.id)!} balance={data!.balance} timeZone={tz} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
