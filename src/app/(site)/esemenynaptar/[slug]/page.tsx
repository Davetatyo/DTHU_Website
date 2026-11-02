import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { DEFAULT_TIMEZONE, formatDateTime } from "@/features/match-organizer/lib/time";
import { EventBody } from "@/features/timetables/components/EventBody";
import { eventEnd, formatEventDate, KIND_LABELS, parseBlocks, publishState, TENTATIVE_LABEL } from "@/features/timetables/lib/events";
import { eventImageUrl, getEventBySlug } from "@/features/timetables/lib/events-data";
import "@/features/timetables/timetables.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return { title: event && publishState(event.published_at) === "live" ? event.title : "Esemény" };
}

// An event's own page. Visitors see it once it's published; admins can open drafts and
// scheduled events too (with a notice), to check them before they go live.
export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const viewer = await getCurrentProfile();
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  const state = publishState(event.published_at);
  const isAdmin = !!viewer?.is_admin;
  if (state !== "live" && !isAdmin) notFound();

  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const parsed = parseBlocks(event.body, event.id);
  const cover = eventImageUrl(event.cover_path);
  const past = eventEnd(event, tz) < new Date();

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <Link href={routes.timetables} className="muted text-sm">
        ← Eseménynaptár
      </Link>

      {state !== "live" && (
        <p className="alert-info">
          {state === "draft"
            ? "Piszkozat: csak az adminok látják, a naptárban még nem jelenik meg."
            : `Időzítve: ${formatDateTime(event.published_at!, tz)}-kor jelenik meg. Addig csak az adminok látják.`}
        </p>
      )}

      <header className={`ev-hero ${event.kind}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage
          <img src={cover} alt="" className="ev-hero-img" />
        )}
        <div className="ev-hero-in">
          <div className="flex flex-wrap gap-2">
            <span className="chip info">{KIND_LABELS[event.kind]}</span>
            {event.tentative && <span className="chip mut">{TENTATIVE_LABEL}</span>}
            {past && <span className="chip mut">Lezajlott</span>}
          </div>
          <h1>{event.title}</h1>
          <p className="px">{formatEventDate(event.starts_at, event.ends_at, event.all_day, tz)}</p>
          {event.location && <p className="muted">{event.location}</p>}
        </div>
      </header>

      {event.summary && <p className="lead">{event.summary}</p>}
      {parsed.ok && <EventBody blocks={parsed.blocks} />}

      <div className="flex flex-wrap gap-2">
        {event.link_url && (
          <a href={event.link_url} target="_blank" rel="noopener noreferrer" className="btn">
            Az esemény oldala ↗
          </a>
        )}
        {isAdmin && (
          <Link href={routes.adminEvent(event.id)} className="btn btn-secondary">
            Szerkesztés
          </Link>
        )}
      </div>
    </article>
  );
}
