import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { KIND_LABELS, PUBLISH_LABELS, publishState } from "@/features/timetables/lib/events";
import { formatEventDate } from "@/features/timetables/lib/events";
import { getAllEvents } from "@/features/timetables/lib/events-data";
import { formatDateTime } from "@/features/match-organizer/lib/time";

export const metadata: Metadata = { title: "Események" };

const STATE_CHIP = { draft: "mut", scheduled: "warn", live: "ok" } as const;

// Admin-only: every event of the Eseménynaptár, drafts included.
export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ uzenet?: string; hiba?: string }> }) {
  const me = await requireAdmin();
  const { uzenet, hiba } = await searchParams;
  const events = await getAllEvents();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={routes.admin} className="muted text-sm">
        ← Admin felület
      </Link>
      <div className="sec-h">
        <h1>Események</h1>
      </div>
      <p className="muted">
        Az Eseménynaptár eseményei. Az új esemény piszkozatként mentődik; a naptárban csak közzététel után (vagy az
        időzített időpontban) jelenik meg. Az online bajnokság fordulói maguktól kerülnek a naptárba.
      </p>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      <Link href={routes.adminEventNew} className="btn">
        + Új esemény
      </Link>

      {events.length === 0 ? (
        <p className="card muted">Még nincs esemény.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Esemény</th>
                <th>Időpont</th>
                <th>Állapot</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const state = publishState(e.published_at);
                return (
                  <tr key={e.id}>
                    <td className="py-1.5 pr-2">
                      <b>{e.title}</b>
                      {e.pinned && <span className="badge badge-proposed ml-1">kiemelt</span>}
                      <span className="muted block text-sm">{KIND_LABELS[e.kind]}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-sm">{formatEventDate(e.starts_at, e.ends_at, e.all_day, me.timezone)}</td>
                    <td className="py-1.5 pr-2">
                      <span className={`chip ${STATE_CHIP[state]}`}>{PUBLISH_LABELS[state]}</span>
                      {state === "scheduled" && <span className="muted block text-sm">{formatDateTime(e.published_at!, me.timezone)}</span>}
                    </td>
                    <td className="py-1.5 text-right">
                      <Link href={routes.adminEvent(e.id)} className="btn btn-secondary btn-sm">
                        Szerkesztés
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
