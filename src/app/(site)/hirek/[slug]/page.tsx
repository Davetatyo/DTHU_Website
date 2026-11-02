import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site";
import { eventIdsIn } from "@/lib/content-blocks";
import { stripInline } from "@/lib/inline-format";
import { publishState } from "@/lib/publishing";
import { ContentBody, type EmbeddedEvent } from "@/components/content/ContentBody";
import { InlineText } from "@/components/content/InlineText";
import { DEFAULT_TIMEZONE, formatDateTime, formatDay } from "@/features/match-organizer/lib/time";
import { CATEGORY_CHIP, CATEGORY_LABELS, NEWS_IMAGE_BUCKET, parseNewsBlocks, showEdited } from "@/features/landing-page/lib/news";
import { getAdjacentNews, getAuthors, getNewsBySlug, newsImageUrl } from "@/features/landing-page/lib/news-data";
import { getEventCards } from "@/features/timetables/lib/events-data";
import "@/features/landing-page/news.css";
import "@/features/timetables/timetables.css";

type Props = { params: Promise<{ slug: string }> };

/**
 * Title and share preview (Open Graph): Facebook and Discord show the card picture, title and
 * bevezető when someone posts the link. Crawlers can only read it once the site is public.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getNewsBySlug((await params).slug);
  if (!article || publishState(article.published_at) !== "live") return { title: "Hír" };
  const site = await getSiteUrl();
  const description = article.lead ? stripInline(article.lead) : undefined;
  const image = newsImageUrl(article.cover_path);
  return {
    title: article.title,
    description,
    alternates: { canonical: `${site}${routes.newsArticle(article.slug)}` },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: `${site}${routes.newsArticle(article.slug)}`,
      siteName: "DTHU – Dice Throne Hungary",
      locale: "hu_HU",
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.edited_at ?? undefined,
      images: image ? [{ url: image, width: 1280, height: 720 }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: article.title, description, images: image ? [image] : undefined },
  };
}

// A news article. Visitors see it once it's published; admins can open drafts and scheduled
// articles too (with a notice).
export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const viewer = await getCurrentProfile();
  const article = await getNewsBySlug(slug);
  if (!article) notFound();
  const state = publishState(article.published_at);
  const isAdmin = !!viewer?.is_admin;
  if (state !== "live" && !isAdmin) notFound();

  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const parsed = parseNewsBlocks(article.body, article.id);
  const blocks = parsed.ok ? parsed.blocks : [];
  const [authors, cards, adjacent, site] = await Promise.all([
    getAuthors([article.author_id]),
    getEventCards(eventIdsIn(blocks), tz),
    getAdjacentNews(article),
    getSiteUrl(),
  ]);
  const author = article.author_id ? authors.get(article.author_id) : undefined;
  const events: Record<string, EmbeddedEvent> = Object.fromEntries(
    Object.entries(cards).map(([id, c]) => [id, { title: c.title, dateLabel: c.dateLabel, href: c.href, external: c.external, cover: c.cover }]),
  );
  const cover = newsImageUrl(article.cover_path);

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <Link href={routes.news} className="muted text-sm">
        ← Hírek
      </Link>

      {state !== "live" && (
        <p className="alert-info">
          {state === "draft"
            ? "Piszkozat: csak az adminok látják."
            : `Időzítve: ${formatDateTime(article.published_at!, tz)}-kor jelenik meg. Addig csak az adminok látják.`}
        </p>
      )}

      <header className="ev-hero other">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage
          <img src={cover} alt="" className="ev-hero-img" />
        )}
        <div className="ev-hero-in">
          <div className="flex flex-wrap gap-2">
            <Link href={routes.newsCategory(article.category)} className={`chip ${CATEGORY_CHIP[article.category]}`}>
              {CATEGORY_LABELS[article.category]}
            </Link>
            {article.pinned && <span className="chip warn">Kiemelt</span>}
          </div>
          <h1>{article.title}</h1>
        </div>
      </header>

      <div className="na-byline">
        {author?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- a profile picture from Supabase Storage
          <img src={author.avatar} alt="" />
        ) : (
          <span className="na-noav" aria-hidden>
            {(author?.name ?? "D").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span>
          <b>{author?.name ?? "DTHU"}</b>
          {article.published_at && <> · {formatDay(article.published_at, tz)}</>}
          {showEdited(article.published_at, article.edited_at) && <> · Frissítve: {formatDateTime(article.edited_at!, tz)}</>}
        </span>
      </div>

      {article.lead && (
        <p className="na-lead">
          <InlineText text={article.lead} />
        </p>
      )}
      <ContentBody blocks={blocks} bucket={NEWS_IMAGE_BUCKET} host={new URL(site).hostname} events={events} />

      {isAdmin && (
        <Link href={routes.adminNewsItem(article.id)} className="btn btn-secondary">
          Szerkesztés
        </Link>
      )}

      {(adjacent.newer || adjacent.older) && (
        <nav className="na-nav" aria-label="További hírek">
          {adjacent.older && (
            <Link href={routes.newsArticle(adjacent.older.slug)}>
              <small>‹ Előző hír</small>
              {adjacent.older.title}
            </Link>
          )}
          {adjacent.newer && (
            <Link href={routes.newsArticle(adjacent.newer.slug)} className="next">
              <small>Következő hír ›</small>
              {adjacent.newer.title}
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
