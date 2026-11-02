import type { Metadata } from "next";
import Link from "next/link";
import { TacticianGame } from "@/features/games/components/TacticianGame";
import { tacticianData } from "@/features/games/lib/tactician-data";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Taktikai Előny",
  description: "Gondolj egy Dice Throne hősre: a Hadvezér legfeljebb 10 kérdésből kitalálja.",
};

/** Owner (2026-11-03): anyone logged in with Discord can play. */
export default async function TacticianGamePage() {
  const profile = await getCurrentProfile();
  return (
    <div className="space-y-3">
      <div className="sec-h">
        <h1>Taktikai Előny</h1>
      </div>
      {profile ? (
        <TacticianGame data={tacticianData()} />
      ) : (
        <div className="card space-y-3 text-center">
          <p className="lead" style={{ margin: "0 auto" }}>
            A Hadvezér csak azokkal játszik, akiket ismer. Lépj be Discorddal, és mérd össze vele az eszed!
          </p>
          <Link href={routes.login} className="btn btn-discord">
            Belépés Discorddal
          </Link>
        </div>
      )}
      <p className="muted text-sm">
        <Link href={routes.games} className="link">
          ‹ Játékok
        </Link>
      </p>
    </div>
  );
}
