import type { Metadata } from "next";
import Link from "next/link";
import { SpotGame } from "@/features/games/components/SpotGame";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Szemfüles",
  description: "Keresd meg a 10 különbséget 60 másodperc alatt!",
};

/** Owner (2026-11-03): logged-in players; no saving or XP (the best score stays in the browser). */
export default async function SpotGamePage() {
  const profile = await getCurrentProfile();
  return (
    <div className="space-y-3">
      <div className="sec-h">
        <h1>Szemfüles</h1>
      </div>
      {profile ? (
        <SpotGame />
      ) : (
        <div className="card space-y-3 text-center">
          <p className="lead" style={{ margin: "0 auto" }}>
            Lépj be Discorddal, és mutasd meg, milyen éles a szemed!
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
