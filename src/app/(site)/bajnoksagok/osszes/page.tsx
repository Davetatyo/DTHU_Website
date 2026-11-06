import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { DEFAULT_TIMEZONE } from "@/features/match-organizer/lib/time";
import { ChampionshipList } from "@/features/championships/components/ChampionshipList";
import { getChampionships, getMyChampionshipIds, getRegistrationCounts, startDue } from "@/features/championships/lib/run";

export const metadata: Metadata = { title: "Összes bajnokság" };

export default async function AllChampionshipsPage() {
  const me = await getCurrentProfile();
  const championships = await getChampionships({ includeDrafts: false });
  if (await startDue(championships)) redirect(routes.championshipsAll);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted">Jelentkezz egy nyitott bajnokságra, vagy kövesd élőben a folyamatban lévőket.</p>
        {(await getAdminView()) && (
          <Link href={routes.championshipsAdmin} className="btn btn-secondary">
            Új bajnokság
          </Link>
        )}
      </div>
      <ChampionshipList
        championships={championships}
        mine={await getMyChampionshipIds(me?.id)}
        counts={await getRegistrationCounts(championships.map((t) => t.id))}
        admin={!!me?.is_admin}
        timeZone={me?.timezone ?? DEFAULT_TIMEZONE}
      />
    </div>
  );
}
