import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { DEFAULT_TIMEZONE } from "@/features/match-organizer/lib/time";
import { NewsCard } from "@/features/landing-page/components/NewsCard";
import { CATEGORY_LABELS, isNewsCategory, OFFERED_CATEGORIES } from "@/features/landing-page/lib/news";
import { getPublishedNews } from "@/features/landing-page/lib/news-data";

export const metadata: Metadata = { title: "Hírek" };

const PER_PAGE = 12;

// Every published article: pinned first, then newest; filter by category, 12 per page.
export default async function NewsListPage({ searchParams }: { searchParams: Promise<{ rovat?: string; oldal?: string }> }) {
  const { rovat, oldal } = await searchParams;
  const category = isNewsCategory(rovat) ? rovat : undefined;
  const page = Math.max(1, Number.parseInt(oldal ?? "1", 10) || 1);
  const viewer = await getCurrentProfile();
  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const { rows, total } = await getPublishedNews({ category, page, perPage: PER_PAGE });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const href = (c: string | undefined, p = 1) => {
    const q = new URLSearchParams();
    if (c) q.set("rovat", c);
    if (p > 1) q.set("oldal", String(p));
    const s = q.toString();
    return s ? `${routes.news}?${s}` : routes.news;
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Hírek</h1>
        </div>
        <p className="lead">A DTHU közösség hírei: bajnokság, élő események, közösség és az oldal fejlesztései.</p>
      </div>

      <nav className="news-filter" aria-label="Rovatok">
        <Link href={href(undefined)} aria-current={!category ? "page" : undefined}>
          Összes
        </Link>
        {OFFERED_CATEGORIES.map((c) => (
          <Link key={c} href={href(c)} aria-current={category === c ? "page" : undefined}>
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </nav>

      {rows.length ? (
        <div className="news4">
          {rows.map((n) => (
            <NewsCard key={n.id} article={n} timeZone={tz} />
          ))}
        </div>
      ) : (
        <p className="card muted">{category ? "Ebben a rovatban még nincs hír." : "Még nincs hír."}</p>
      )}

      {pages > 1 && (
        <nav className="news-pager" aria-label="Lapozás">
          {page > 1 ? <Link href={href(category, page - 1)} className="btn btn-secondary btn-sm">‹ Újabb hírek</Link> : <span />}
          <span className="muted self-center text-sm">
            {page} / {pages}
          </span>
          {page < pages ? <Link href={href(category, page + 1)} className="btn btn-secondary btn-sm">Régebbi hírek ›</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
