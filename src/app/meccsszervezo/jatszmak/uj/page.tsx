import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { HERO_NAMES } from "@/lib/heroes";
import { routes } from "@/lib/routes";
import { utcToWallTime } from "@/features/match-organizer/lib/time";
import { GameForm } from "@/features/match-reporting/components/GameForm";
import { canUseMatchReporting } from "@/features/match-reporting/lib/access";
import { getOpenFixtures, getOpponents } from "@/features/match-reporting/lib/data";
import { BACKDATE_DAYS } from "@/features/match-reporting/lib/report";

export const metadata: Metadata = { title: "Új játszma" };

export default async function NewGamePage() {
  const viewer = await requireProfile();
  if (!(await canUseMatchReporting())) redirect(routes.organizer);
  const [opponents, fixtures] = await Promise.all([getOpponents(viewer.id), getOpenFixtures(viewer.id)]);
  const now = new Date();
  const nowWall = utcToWallTime(now, viewer.timezone);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={routes.gameLog} className="link text-sm">
        ← Játszmáim
      </Link>
      <div className="sec-h">
        <h1>Új játszma</h1>
      </div>
      <p className="muted -mt-2 text-sm">
        Bajnokságon kívüli játszma rögzítése. Az ellenfeled kap egy jelzést az oldalon, és elfogadja vagy javítja.
      </p>
      <div className="card p-4">
        <GameForm
          mode="new"
          heroNames={HERO_NAMES}
          myName={viewer.karnyx_name ?? viewer.display_name ?? "Én"}
          opponents={opponents.map((o) => ({ id: o.id, name: o.name }))}
          fixtures={fixtures}
          maxWall={nowWall}
          minWall={utcToWallTime(new Date(now.getTime() - BACKDATE_DAYS * 86_400_000), viewer.timezone)}
          initial={{ my_hero: "", opp_hero: "", my_hp: "", opp_hp: "", my_ult: "", opp_ult: "", outcome: "", played_at: nowWall }}
        />
      </div>
    </div>
  );
}
