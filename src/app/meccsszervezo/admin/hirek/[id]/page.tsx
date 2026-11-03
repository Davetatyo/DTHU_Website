import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { BlocksEditor } from "@/components/content/BlocksEditor";
import { CoverEditor } from "@/components/content/CoverEditor";
import { ALL_BLOCKS } from "@/lib/content-blocks";
import { PUBLISH_LABELS, publishState } from "@/lib/publishing";
import { formatDateTime, utcToWallTime } from "@/features/match-organizer/lib/time";
import { deleteNews, removeNewsCover, saveNews, uploadNewsImage } from "@/features/landing-page/actions/news";
import { NewsFormFields } from "@/features/landing-page/components/NewsFormFields";
import { NEWS_IMAGE_BUCKET, parseNewsBlocks } from "@/features/landing-page/lib/news";
import { getAuthorOptions, getNewsById, newsImageUrl } from "@/features/landing-page/lib/news-data";
import { getPollChoices } from "@/features/landing-page/lib/polls-data";
import { formatEventDate } from "@/features/timetables/lib/events";
import { getAllEvents } from "@/features/timetables/lib/events-data";

export const metadata: Metadata = { title: "Hír szerkesztése" };

// Admin-only: edit an article, its card picture and content, and publish it (now or at a set
// time) or take it back to draft.
export default async function EditNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;
  const { uzenet, hiba } = await searchParams;
  const article = await getNewsById(id);
  if (!article) notFound();

  const tz = me.timezone;
  const state = publishState(article.published_at);
  const parsed = parseNewsBlocks(article.body, article.id);
  const [authors, events, pollChoices] = await Promise.all([getAuthorOptions(), getAllEvents(), getPollChoices()]);
  const eventOptions = events.map((e) => ({ id: e.id, label: `${e.title} · ${formatEventDate(e.starts_at, e.ends_at, e.all_day, tz)}` }));
  const scheduledAt = state === "scheduled" ? utcToWallTime(new Date(article.published_at!), tz) : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={routes.adminNews} className="muted text-sm">
        ← Hírek
      </Link>
      <div className="sec-h">
        <h1>Hír szerkesztése</h1>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      <div className="card flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className={`chip ${state === "live" ? "ok" : state === "scheduled" ? "warn" : "mut"}`}>{PUBLISH_LABELS[state]}</span>
          <span className="muted ml-2 text-sm">
            {state === "live" && `Kint van (${formatDateTime(article.published_at!, tz)} óta).`}
            {state === "scheduled" && `Magától megjelenik: ${formatDateTime(article.published_at!, tz)}.`}
            {state === "draft" && "Csak az adminok látják."}
          </span>
        </div>
        <Link href={routes.newsArticle(article.slug)} className="btn btn-secondary btn-sm">
          Hír oldala ›
        </Link>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Kártya kép
          <InfoTip text="A hírkártyán, a hír tetején és megosztáskor (Facebook, Discord) jelenik meg. Azonnal mentődik." />
        </h2>
        <CoverEditor
          ownerField="news_id"
          ownerId={article.id}
          currentUrl={newsImageUrl(article.cover_path)}
          emptyText="Nincs kép: a kártya a rovat színeit mutatja."
          upload={uploadNewsImage}
          remove={removeNewsCover}
        />
      </section>

      <form action={saveNews} className="space-y-4">
        <input type="hidden" name="news_id" value={article.id} />
        <section className="card">
          <NewsFormFields
            authors={authors}
            values={{
              title: article.title,
              category: article.category,
              lead: article.lead ?? "",
              author_id: article.author_id ?? me.id,
              pinned: article.pinned,
            }}
          />
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg font-bold">
            Tartalom
            <InfoTip text="Blokkokból áll: bekezdés, felsorolás, idézet, kiemelt doboz, kép, galéria, videó, link, esemény kártya, szavazás, szavazás eredménye, elválasztó. A szövegben a B / I / 🔗 gombokkal félkövér, dőlt és link is lehet." />
          </h2>
          <BlocksEditor
            ownerField="news_id"
            ownerId={article.id}
            bucket={NEWS_IMAGE_BUCKET}
            initial={parsed.ok ? parsed.blocks : []}
            allowed={ALL_BLOCKS}
            upload={uploadNewsImage}
            events={eventOptions}
            polls={pollChoices}
          />
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg font-bold">Mentés és közzététel</h2>
          <SubmitButton className="btn w-full" name="intent" value="save">
            Mentés ({PUBLISH_LABELS[state].toLowerCase()} marad)
          </SubmitButton>
          {state === "live" && <p className="muted text-sm">Közzététel után a mentés „Frissítve” dátumot tesz a hírre.</p>}
          {state !== "live" && (
            <>
              <SubmitButton className="btn btn-secondary w-full" name="intent" value="publish_now">
                Mentés és közzététel most
              </SubmitButton>
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-0 flex-1 text-sm">
                  <span className="muted">Megjelenés ideje ({tz})</span>
                  <input type="datetime-local" name="publish_at" className="input" defaultValue={scheduledAt} />
                </label>
                <SubmitButton className="btn btn-secondary" name="intent" value="schedule">
                  {state === "scheduled" ? "Új időpont mentése" : "Időzített közzététel"}
                </SubmitButton>
              </div>
            </>
          )}
          {state !== "draft" && (
            <SubmitButton className="btn btn-danger w-full" name="intent" value="unpublish">
              Visszavonás piszkozatba
            </SubmitButton>
          )}
        </section>
      </form>

      <form action={deleteNews} className="card danger-zone space-y-2">
        <input type="hidden" name="news_id" value={article.id} />
        <h2 className="text-lg font-bold">Hír törlése</h2>
        <p className="muted text-sm">A hír és minden képe véglegesen törlődik. Ha csak elrejtenéd, vond vissza piszkozatba.</p>
        <SubmitButton className="btn btn-danger" confirm={`Biztosan véglegesen törlöd: ${article.title}?`}>
          Törlés
        </SubmitButton>
      </form>
    </div>
  );
}
