import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteEvent, removeEventCover, saveEvent, uploadEventImage } from "@/features/timetables/actions/events";
import { BlocksEditor } from "@/components/content/BlocksEditor";
import { CoverEditor } from "@/components/content/CoverEditor";
import { SIMPLE_BLOCKS } from "@/lib/content-blocks";
import { EventFormFields } from "@/features/timetables/components/EventFormFields";
import { eventFormDefaults } from "@/features/timetables/lib/event-form";
import { EVENT_IMAGE_BUCKET, parseBlocks, PUBLISH_LABELS, publishState } from "@/features/timetables/lib/events";
import { eventImageUrl, getEventById } from "@/features/timetables/lib/events-data";
import { formatDateTime, utcToWallTime } from "@/features/match-organizer/lib/time";

export const metadata: Metadata = { title: "Esemény szerkesztése" };

// Admin-only: edit an event, its card picture and page content, and publish it (now or at a
// set time) or take it back to draft.
export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;
  const { uzenet, hiba } = await searchParams;
  const event = await getEventById(id);
  if (!event) notFound();

  const tz = me.timezone;
  const state = publishState(event.published_at);
  const parsed = parseBlocks(event.body, event.id);
  const blocks = parsed.ok ? parsed.blocks : [];
  const scheduledAt = state === "scheduled" ? utcToWallTime(new Date(event.published_at!), tz) : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={routes.adminEvents} className="muted text-sm">
        ← Események
      </Link>
      <div className="sec-h">
        <h1>Esemény szerkesztése</h1>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      <div className="card flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className={`chip ${state === "live" ? "ok" : state === "scheduled" ? "warn" : "mut"}`}>{PUBLISH_LABELS[state]}</span>
          <span className="muted ml-2 text-sm">
            {state === "live" && `Látszik a naptárban (${formatDateTime(event.published_at!, tz)} óta).`}
            {state === "scheduled" && `Magától megjelenik: ${formatDateTime(event.published_at!, tz)}.`}
            {state === "draft" && "Csak az adminok látják itt, a naptárban nem."}
          </span>
        </div>
        {!event.card_only && (
          <Link href={routes.event(event.slug)} className="btn btn-secondary btn-sm">
            Esemény oldala ›
          </Link>
        )}
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Kártya kép
          <InfoTip text="A naptár kártyáján és az esemény oldalának tetején jelenik meg. Feltöltés előtt a kártya alakjára vághatod; azonnal mentődik." />
        </h2>
        <CoverEditor
          ownerField="event_id"
          ownerId={event.id}
          currentUrl={eventImageUrl(event.cover_path)}
          emptyText="Nincs kép: a kártya az esemény fajtájának színeit mutatja."
          upload={uploadEventImage}
          remove={removeEventCover}
        />
      </section>

      <form action={saveEvent} className="space-y-4">
        <input type="hidden" name="event_id" value={event.id} />
        <section className="card">
          <EventFormFields
            timeZone={tz}
            values={{
              title: event.title,
              kind: event.kind,
              tentative: event.tentative,
              ...eventFormDefaults(event, tz),
              location: event.location ?? "",
              summary: event.summary ?? "",
              link_url: event.link_url ?? "",
              card_only: event.card_only,
              pinned: event.pinned,
            }}
          />
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg font-bold">
            Az esemény oldala
            <InfoTip text="Alcímek, bekezdések, képek és linkek tetszőleges sorrendben. „Csak kártya” eseménynél nem jelenik meg." />
          </h2>
          <BlocksEditor
            ownerField="event_id"
            ownerId={event.id}
            bucket={EVENT_IMAGE_BUCKET}
            initial={blocks}
            allowed={SIMPLE_BLOCKS}
            upload={uploadEventImage}
          />
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg font-bold">Mentés és közzététel</h2>
          <SubmitButton className="btn w-full" name="intent" value="save">
            Mentés ({PUBLISH_LABELS[state].toLowerCase()} marad)
          </SubmitButton>
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

      <form action={deleteEvent} className="card danger-zone space-y-2">
        <input type="hidden" name="event_id" value={event.id} />
        <h2 className="text-lg font-bold">Esemény törlése</h2>
        <p className="muted text-sm">Az esemény és minden képe véglegesen törlődik. Ha csak elrejtenéd, vond vissza piszkozatba.</p>
        <SubmitButton className="btn btn-danger" confirm={`Biztosan véglegesen törlöd: ${event.title}?`}>
          Törlés
        </SubmitButton>
      </form>
    </div>
  );
}
