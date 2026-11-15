import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InfoTip } from "@/components/InfoTip";
import { requireProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { GameRow } from "@/features/match-reporting/components/GameRow";
import { canUseMatchReporting } from "@/features/match-reporting/lib/access";
import { getMyGames } from "@/features/match-reporting/lib/data";
import { awaitingProfile } from "@/features/match-reporting/lib/rights";
import "@/features/match-reporting/match-reporting.css";

export const metadata: Metadata = { title: "Játszmák" };

export default async function GameLogPage({ searchParams }: { searchParams: Promise<{ uzenet?: string }> }) {
  const viewer = await requireProfile();
  if (!(await canUseMatchReporting())) redirect(routes.organizer);
  const { uzenet } = await searchParams;
  const games = await getMyGames(viewer.id);

  const inbox = games.filter((g) => awaitingProfile(g) === viewer.id);
  const waiting = games.filter((g) => g.status === "pending" && awaitingProfile(g) !== viewer.id);
  const closed = games.filter((g) => g.status !== "pending");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="sec-h flex flex-wrap items-center justify-between gap-3">
        <h1>Játszmáim</h1>
        <Link href={routes.gameNew} className="btn">
          + Új játszma
        </Link>
      </div>
      <p className="muted -mt-2 text-sm">
        Bajnokságon kívüli játszmáid. Az ellenfeled jóváhagyásával lesz végleges.
        <InfoTip text="Ha 7 napig nem jön válasz, a játszma lejár és nem számít bele semmibe. A 3. napon és a lejárat előtt 24 órával Discordon szólunk." />
      </p>
      {uzenet && <p className="alert-ok">{uzenet}</p>}

      <section className="gr-card">
        <h2>
          Elfogadásra vár {inbox.length > 0 && <span className="gr-count">{inbox.length}</span>}
        </h2>
        <p className="gr-note">Ezeket az ellenfeled küldte be: nézd meg, és fogadd el vagy javítsd.</p>
        {inbox.length === 0 ? (
          <p className="gr-empty">Nincs jóváhagyásra váró játszmád.</p>
        ) : (
          <ul className="gr-list">
            {inbox.map((g) => (
              <li key={g.id}>
                <GameRow game={g} viewerId={viewer.id} timeZone={viewer.timezone} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {waiting.length > 0 && (
        <section className="gr-card">
          <h2>Elküldve, válaszra vár</h2>
          <ul className="gr-list">
            {waiting.map((g) => (
              <li key={g.id}>
                <GameRow game={g} viewerId={viewer.id} timeZone={viewer.timezone} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="gr-card">
        <h2>Lezárt játszmák</h2>
        {closed.length === 0 ? (
          <p className="gr-empty">Még nincs lezárt játszmád.</p>
        ) : (
          <ul className="gr-list">
            {closed.map((g) => (
              <li key={g.id}>
                <GameRow game={g} viewerId={viewer.id} timeZone={viewer.timezone} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
