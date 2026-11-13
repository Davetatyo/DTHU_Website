import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { HERO_NAMES } from "@/lib/heroes";
import { routes } from "@/lib/routes";
import { ChampionshipOverview, VIEW_COOKIE } from "@/features/championships/components/ChampionshipOverview";
import { MyChampionshipChips } from "@/features/championships/components/ChampionshipList";
import { HeroPicker } from "@/features/championships/components/HeroPicker";
import { ParticipantList } from "@/features/championships/components/ParticipantList";
import { leaveTournament, lockRegistration, saveRegistration } from "@/features/championships/actions/entry";
import { DEFAULT_TIMEZONE, formatDateTime } from "@/features/match-organizer/lib/time";
import { resolveView } from "@/features/match-organizer/lib/view";
import { championshipAccess } from "@/features/championships/lib/access";
import {
  getChampionships,
  getMyChampionshipIds,
  getRegistrations,
  getTournamentBySlug,
  startDue,
} from "@/features/championships/lib/run";
import { FORMAT_LABELS, STATUS_LABELS } from "@/features/championships/lib/rules";
import { HeroIcons } from "@/components/HeroIcon";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = await getTournamentBySlug((await params).slug);
  return { title: t?.name ?? "Bajnokság" };
}

export default async function ChampionshipPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ uzenet?: string; hiba?: string; nezet?: string }>;
}) {
  const [{ slug }, { uzenet, hiba, nezet }] = await Promise.all([params, searchParams]);
  const found = await getTournamentBySlug(slug);
  if (!found) notFound();
  if (await startDue([found])) redirect(routes.championship(found.slug));
  const t = found;

  const me = await getCurrentProfile();
  const adminView = await getAdminView();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const myIds = await getMyChampionshipIds(me?.id);
  const access = championshipAccess(t.status, { participant: myIds.has(t.id), admin: !!me?.is_admin });
  if (access === "hidden") {
    if (t.status === "draft") notFound();
    return (
      <div className="space-y-3">
        <p className="panel3 p-4">
          Ez a bajnokság már véget ért. Az eredményeit csak a résztvevői látják.{" "}
          <Link href={routes.championshipsAll} className="link">
            Összes bajnokság
          </Link>
        </p>
      </div>
    );
  }

  const mine = (await getChampionships({ includeDrafts: false })).filter((c) => myIds.has(c.id));

  return (
    <div className="space-y-5">
      <MyChampionshipChips mine={mine} current={t.slug} />
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      {t.status === "registration" || t.status === "draft" ? (
        <Registration tournament={t} me={me} timeZone={tz} />
      ) : (
        <ChampionshipOverview
          tournament={t}
          access={access === "full" ? "full" : "readonly"}
          viewerName={me?.karnyx_name ?? null}
          adminView={adminView}
          timeZone={tz}
          view={resolveView(nezet, (await cookies()).get(VIEW_COOKIE)?.value, "lista")}
        />
      )}
    </div>
  );
}

/** Before the start: sign up with 3 heroes, change them, lock in or leave; the sign-up list. */
async function Registration({
  tournament: t,
  me,
  timeZone: tz,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
  me: Awaited<ReturnType<typeof getCurrentProfile>>;
  timeZone: string;
}) {
  const registrations = await getRegistrations(t.id);
  const mine = me ? registrations.find((r) => r.profile_id === me.id) ?? null : null;

  return (
    <>
      <div className="space-y-1">
        <div className="sec-h">
          <h1>{t.name}</h1>
        </div>
        <p className="muted text-sm">
          {STATUS_LABELS[t.status]} · {FORMAT_LABELS[t.format]}
          {t.starts_at ? ` · Kezdés: ${formatDateTime(t.starts_at, tz)}` : " · Kezdés: az admin indítja"}
        </p>
      </div>

      {t.status === "registration" && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">
            {mine ? "A jelentkezésed" : "Jelentkezés"}
            <InfoTip text="Válassz 3 különböző hőst. A kezdésig bármikor módosíthatod őket. Ha véglegesíted, már nem változtathatsz. A kezdéskor minden jelentkező bekerül a versenybe, véglegesítve vagy sem." />
          </h2>
          {!me ? (
            <p className="text-sm">
              <Link href={routes.login} className="underline">Jelentkezz be</Link> a részvételhez.
            </p>
          ) : !me.karnyx_name ? (
            <p className="text-sm">
              A jelentkezéshez Karnyx név kell.{" "}
              <Link href={routes.profile} className="underline">Állítsd be a profilodban.</Link>
            </p>
          ) : mine?.locked_at ? (
            <div className="space-y-1 text-sm">
              <p>
                <span className="badge badge-confirmed">Véglegesítve</span> Ezekkel a hősökkel indulsz:{" "}
                <HeroIcons heroes={mine.heroes} />
              </p>
              <p className="muted">A hősöket a többiek a kezdéskor látják.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <form action={saveRegistration} className="space-y-3">
                <input type="hidden" name="slug" value={t.slug} />
                <HeroPicker heroes={HERO_NAMES} initial={mine?.heroes ?? []} />
                <p className="muted text-xs">A választásod a kezdésig titkos, csak te és az adminok látják.</p>
                <SubmitButton>{mine ? "Hősök mentése" : `Jelentkezem ${me.karnyx_name} néven`}</SubmitButton>
              </form>
              {mine && (
                <div className="flex flex-wrap gap-2">
                  <form action={lockRegistration}>
                    <input type="hidden" name="slug" value={t.slug} />
                    <SubmitButton
                      className="btn btn-secondary"
                      confirm={`Véglegesíted? Utána a hőseid (${mine.heroes.join(", ")}) már nem módosíthatók.`}
                    >
                      🔒 Véglegesítés
                    </SubmitButton>
                  </form>
                  <form action={leaveTournament}>
                    <input type="hidden" name="slug" value={t.slug} />
                    <SubmitButton className="btn btn-danger" confirm="Biztosan kilépsz a versenyből?">
                      Kilépés
                    </SubmitButton>
                  </form>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">Jelentkezők ({registrations.length})</h2>
        {registrations.length === 0 ? (
          <p className="muted text-sm">Még senki. Légy te az első!</p>
        ) : (
          <ParticipantList people={registrations.map((r) => ({ name: r.karnyx_name, locked: !!r.locked_at }))} />
        )}
      </section>
    </>
  );
}
