import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { SubmitButton } from "@/components/SubmitButton";
import { createEvent } from "@/features/timetables/actions/events";
import { EMPTY_EVENT_FORM, EventFormFields } from "@/features/timetables/components/EventFormFields";

export const metadata: Metadata = { title: "Új esemény" };

// Admin-only: the first step of a new event. It's saved as a draft; pictures, content and
// publishing follow on the edit page.
export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  const me = await requireAdmin();
  const { hiba } = await searchParams;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={routes.adminEvents} className="muted text-sm">
        ← Események
      </Link>
      <div className="sec-h">
        <h1>Új esemény</h1>
      </div>
      {hiba && <p className="alert-error">{hiba}</p>}
      <form action={createEvent} className="card space-y-4">
        <EventFormFields values={EMPTY_EVENT_FORM} timeZone={me.timezone} />
        <p className="muted text-sm">Piszkozatként mentődik. Utána hozzáadhatod a képet és a leírást, és közzéteheted.</p>
        <SubmitButton className="btn w-full">Piszkozat mentése</SubmitButton>
      </form>
    </div>
  );
}
