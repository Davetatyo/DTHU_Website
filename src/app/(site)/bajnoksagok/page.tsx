import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { DEFAULT_TIMEZONE } from "@/features/match-organizer/lib/time";
import { ChampionshipList } from "@/features/championships/components/ChampionshipList";
import { homeChampionship } from "@/features/championships/lib/access";
import { getChampionships, getMyChampionshipIds, getRegistrationCounts, startDue } from "@/features/championships/lib/run";

// "Áttekintés": opens the viewer's own running championship (or the one they signed up for);
// without one, the list of every championship they can open.
export default async function ChampionshipsHome() {
  const me = await getCurrentProfile();
  const championships = await getChampionships({ includeDrafts: false });
  if (await startDue(championships)) redirect(routes.championships);

  const mine = await getMyChampionshipIds(me?.id);
  const home = homeChampionship(championships.filter((t) => mine.has(t.id)));
  if (home) redirect(routes.championship(home.slug));

  return (
    <div className="space-y-5">
      <p className="muted">
        Még nem játszol egy bajnokságban sem. Jelentkezz egy nyitott bajnokságra, vagy kövesd élőben a folyamatban lévőket.
      </p>
      <ChampionshipList
        championships={championships}
        mine={mine}
        counts={await getRegistrationCounts(championships.map((t) => t.id))}
        admin={!!me?.is_admin}
        timeZone={me?.timezone ?? DEFAULT_TIMEZONE}
      />
    </div>
  );
}
