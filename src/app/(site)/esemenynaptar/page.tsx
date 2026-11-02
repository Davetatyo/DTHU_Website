import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveTournament, getScheduledMatches } from "@/features/match-organizer/lib/data";
import { DEFAULT_TIMEZONE } from "@/features/match-organizer/lib/time";
import { EventsView } from "@/features/timetables/components/EventsView";
import { sortCalendar } from "@/features/timetables/lib/events";
import { getCalendarItems } from "@/features/timetables/lib/events-data";

export const metadata: Metadata = { title: "Eseménynaptár" };

export default async function TimetablesPage() {
  const viewer = await getCurrentProfile();
  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const { upcoming, past } = sortCalendar(await getCalendarItems(tz));

  const tournament = await getActiveTournament();
  const scheduled = tournament ? await getScheduledMatches(tournament.id) : [];
  const matches = scheduled
    .filter((m) => m.status === "confirmed" && m.scheduled_at && m.b)
    .map((m) => ({ at: m.scheduled_at!, a: m.a.karnyx_name, b: m.b!.karnyx_name }));

  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Eseménynaptár</h1>
        </div>
        <p className="lead">Online fordulók, élő versenyek és közösségi programok. A tervezett dátumok változhatnak.</p>
      </div>
      <EventsView upcoming={upcoming} past={past} matches={matches} />
    </div>
  );
}
