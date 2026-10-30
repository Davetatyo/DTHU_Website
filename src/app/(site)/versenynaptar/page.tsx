import type { Metadata } from "next";
import { getActiveTournament, getScheduledMatches } from "@/features/match-organizer/lib/data";
import { EventsView } from "@/features/timetables/components/EventsView";

export const metadata: Metadata = { title: "Versenynaptár" };

export default async function TimetablesPage() {
  const tournament = await getActiveTournament();
  const scheduled = tournament ? await getScheduledMatches(tournament.id) : [];
  const matches = scheduled
    .filter((m) => m.status === "confirmed" && m.scheduled_at && m.b)
    .map((m) => ({ at: m.scheduled_at!, a: m.a.karnyx_name, b: m.b!.karnyx_name }));

  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Versenynaptár</h1>
        </div>
        <p className="lead">Online fordulók és élő események. A tervezett dátumok változhatnak.</p>
      </div>
      <EventsView matches={matches} />
    </div>
  );
}
