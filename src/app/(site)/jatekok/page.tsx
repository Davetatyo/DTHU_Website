import type { Metadata } from "next";
import Link from "next/link";
import { GamesHub, type DailyDone } from "@/features/games/components/GamesHub";
import { DailyNotReady, getDailyState } from "@/features/games/lib/daily-data";
import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Játékok" };

export default async function GamesPage() {
  const viewer = await getCurrentProfile();
  const adminView = await getAdminView();
  // The once-a-day cards turn grey for a player who already played today (migration 0010).
  let daily: DailyDone | undefined;
  if (viewer) {
    try {
      const s = await getDailyState(viewer.id);
      daily = { quiz: !!s.answer, spin: !!s.spin, nextReset: s.nextReset };
    } catch (err) {
      if (!(err instanceof DailyNotReady)) throw err;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Játékok</h1>
          {adminView && (
            <Link href={routes.gamesAdmin} className="btn btn-admin btn-sm">
              Napi játékok kezelése
            </Link>
          )}
        </div>
        <p className="lead">
          Dice Throne játékok a közösségnek. A Napi kvíz és a Szerencsekerék minden éjfélkor (budapesti idő) újraindul.
        </p>
      </div>
      <GamesHub daily={daily} adminView={adminView} />
    </div>
  );
}
