import Link from "next/link";
import { MatchList } from "@/components/MatchList";
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentProfile, sameName } from "@/lib/auth";
import { getActiveTournament, getLatestRound, getRoundMatches, isParticipant } from "@/lib/data";
import { isProfileComplete } from "@/lib/profile";
import { DEFAULT_TIMEZONE, formatDateTime } from "@/lib/time";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ uzenet?: string }> }) {
  const { uzenet } = await searchParams;
  const viewer = await getCurrentProfile();
  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const tournament = await getActiveTournament();
  const round = tournament ? await getLatestRound(tournament.id) : null;
  const matches = round ? await getRoundMatches(round.id) : [];
  const myMatch = viewer ? matches.find((m) => isParticipant(m, viewer.karnyx_name)) : undefined;
  const opponent = myMatch && (sameName(myMatch.a.karnyx_name, viewer?.karnyx_name) ? myMatch.b : myMatch.a);

  const real = matches.filter((m) => m.status !== "bye");
  const played = real.filter((m) => m.status === "played").length;
  const confirmed = real.filter((m) => m.status === "confirmed").length;

  return (
    <div className="space-y-6">
      {uzenet === "profil" && <p className="alert-ok">Profil mentve.</p>}

      {viewer && !isProfileComplete(viewer) && (
        <p className="alert-info">
          Még nem töltötted ki a profilodat.{" "}
          <Link href="/profil" className="link">
            Profil kitöltése
          </Link>
        </p>
      )}

      {!tournament && (
        <div className="card">
          <h1 className="text-xl font-bold">Még nincs aktív verseny</h1>
          <p className="muted mt-1">Amint az admin elindítja az első fordulót, itt látod a párosításokat.</p>
        </div>
      )}

      {myMatch && (
        <Link href={`/meccs/${myMatch.id}`} className="card block hover:opacity-90" style={{ borderColor: "var(--accent)" }}>
          <div className="muted text-sm">Következő meccsem · {round!.number}. forduló</div>
          {opponent ? (
            <div className="mt-1 text-2xl font-bold">vs {opponent.karnyx_name}</div>
          ) : (
            <div className="mt-1 text-2xl font-bold">Bye</div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={myMatch.status} />
            {myMatch.scheduled_at && myMatch.status === "confirmed" && (
              <span className="font-medium">{formatDateTime(myMatch.scheduled_at, tz)}</span>
            )}
            {(myMatch.status === "pending" || myMatch.status === "proposed") && (
              <span className="link">Időpont egyeztetése →</span>
            )}
          </div>
        </Link>
      )}

      {!viewer && tournament && (
        <div className="card">
          <p>
            Lépj be Discorddal, és rögtön látod, ki az ellenfeled, és egyeztethetitek az időpontot.
          </p>
          <Link href="/login" className="btn btn-discord mt-3">
            Belépés Discorddal
          </Link>
        </div>
      )}

      {tournament && round && (
        <section className="card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-bold">
              {tournament.name}: {round.number}. forduló
            </h1>
            <span className="muted text-sm">Határidő: {formatDateTime(round.deadline, tz)}</span>
          </div>
          <p className="muted mt-1 text-sm">
            {played}/{real.length} lejátszva · {confirmed} időpont megbeszélve
            {round.completed_at && " · A forduló befejeződött 🏁"}
          </p>
          <div className="mt-4">
            <MatchList matches={matches} timeZone={tz} highlight={viewer?.karnyx_name} />
          </div>
        </section>
      )}
    </div>
  );
}
