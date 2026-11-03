import Link from "next/link";
import { Art, type ArtSpec } from "@/components/Art";
import { stripInline } from "@/lib/inline-format";
import { routes } from "@/lib/routes";
import { formatShortDate } from "@/features/match-organizer/lib/time";
import { CATEGORY_LABELS, type NewsCategory, type NewsRow } from "../lib/news";
import { newsImageUrl } from "../lib/news-data";
import "../news.css";

/** Card background for articles without a picture, by category. */
const CATEGORY_ART: Record<NewsCategory, ArtSpec> = {
  tournament: { c1: "#4f8fe0", c2: "#8b55d6", g: "swords", plain: true },
  community: { c1: "#d4ab52", c2: "#5eae4a", g: "die", plain: true },
  live: { c1: "#d23a4a", c2: "#d4ab52", g: "trophy", plain: true },
  site: { c1: "#6b6b7a", c2: "#3a3a46", g: "scroll", plain: true },
  shop: { c1: "#e0b24a", c2: "#7a2fb0", g: "ticket", plain: true },
};

/** A news article as a card (home page and the /hirek list). */
export function NewsCard({ article, timeZone }: { article: NewsRow; timeZone: string }) {
  const cover = newsImageUrl(article.cover_path);
  return (
    <Link className="ncard" href={routes.newsArticle(article.slug)}>
      <span className="pic">
        <Art spec={cover ? { img: cover } : CATEGORY_ART[article.category]} />
        {article.pinned && <span className="ncard-pin">Kiemelt</span>}
      </span>
      <span className="lbl">{CATEGORY_LABELS[article.category]}</span>
      <b>{article.title}</b>
      {/* The card is one link, so the bevezető's own marks and links are shown as plain text. */}
      {article.lead && <span className="ncard-lead">{stripInline(article.lead)}</span>}
      {article.published_at && <small>{formatShortDate(article.published_at, timeZone)}</small>}
    </Link>
  );
}
