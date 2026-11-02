import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { PUBLISH_LABELS, publishState } from "@/lib/publishing";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import { CATEGORY_CHIP, CATEGORY_LABELS } from "@/features/landing-page/lib/news";
import { getAllNews } from "@/features/landing-page/lib/news-data";

export const metadata: Metadata = { title: "Hírek kezelése" };

const STATE_CHIP = { draft: "mut", scheduled: "warn", live: "ok" } as const;

// Admin-only: every news article, drafts included.
export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ uzenet?: string; hiba?: string }> }) {
  const me = await requireAdmin();
  const { uzenet, hiba } = await searchParams;
  const news = await getAllNews();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={routes.admin} className="muted text-sm">
        ← Admin felület
      </Link>
      <div className="sec-h">
        <h1>Hírek</h1>
      </div>
      <p className="muted">Az új hír piszkozatként mentődik; az oldalon csak közzététel után (vagy az időzített időpontban) jelenik meg.</p>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      <Link href={routes.adminNewsNew} className="btn">
        + Új hír
      </Link>

      {news.length === 0 ? (
        <p className="card muted">Még nincs hír.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Hír</th>
                <th>Állapot</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {news.map((n) => {
                const state = publishState(n.published_at);
                return (
                  <tr key={n.id}>
                    <td className="py-1.5 pr-2">
                      <b>{n.title}</b>
                      {n.pinned && <span className="badge badge-proposed ml-1">kiemelt</span>}
                      <span className={`chip ${CATEGORY_CHIP[n.category]} mt-1`}>{CATEGORY_LABELS[n.category]}</span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className={`chip ${STATE_CHIP[state]}`}>{PUBLISH_LABELS[state]}</span>
                      {n.published_at && <span className="muted block text-sm">{formatDateTime(n.published_at, me.timezone)}</span>}
                    </td>
                    <td className="py-1.5 text-right">
                      <Link href={routes.adminNewsItem(n.id)} className="btn btn-secondary btn-sm">
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
