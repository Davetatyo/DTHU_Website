import type { Metadata } from "next";
import Link from "next/link";
import { DiceGame } from "@/features/games/components/DiceGame";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Kockázat",
  description: "Kockapóker a Barbár ellen: 5 kocka, 3 dobás, Ultimate, Kis sor, Nagy sor.",
};

/** Owner (2026-11-03): anyone logged in with Discord can play; no saving, no XP yet. */
export default async function DiceGamePage() {
  const profile = await getCurrentProfile();
  return (
    <div className="space-y-3">
      <div className="sec-h">
        <h1>Kockázat</h1>
      </div>
      {profile ? (
        <DiceGame />
      ) : (
        <div className="card space-y-3 text-center">
          <p className="lead" style={{ margin: "0 auto" }}>
            A Barbár csak igazi harcosokkal dob. Lépj be Discorddal, és szállj vele szembe!
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
