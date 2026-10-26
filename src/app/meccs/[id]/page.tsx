import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { SlotPicker } from "@/components/SlotPicker";
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentProfile, sameName } from "@/lib/auth";
import { matchEvent } from "@/lib/calendar";
import { getMatch, getProfilesByKarnyx, getProposals, isParticipant, profileFor } from "@/lib/data";
import { googleCalendarUrl } from "@/lib/ics";
import { getSiteUrl } from "@/lib/site";
import { DEFAULT_TIMEZONE, formatDateTime, pickerDays, utcToWallTime } from "@/lib/time";
import type { Player, Profile } from "@/lib/types";
import { acceptProposal, adminResetMatch, adminSetTime, markPlayed, proposeTimes } from "./actions";

const WEEK_MS = 7 * 24 * 3600_000;

function PlayerCard({ player, profile, showContacts }: { player: Player | null; profile: Profile | null; showContacts: boolean }) {
  if (!player) return <div className="card muted">Bye, nincs ellenfél.</div>;
  return (
    <div className="card">
      <div className="text-lg font-bold">{player.karnyx_name}</div>
      {player.heroes.length > 0 && <div className="muted text-sm">{player.heroes.join(" · ")}</div>}
      {showContacts && (
        <dl className="mt-3 space-y-1 text-sm">
          {profile ? (
            <>
              <div>
                <dt className="muted inline">Facebook: </dt>
                <dd className="inline font-medium">{profile.facebook_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="muted inline">Discord: </dt>
                <dd className="inline font-medium">{profile.discord_username ?? "—"}</dd>
              </div>
            </>
          ) : (
            <div className="muted">Még nem regisztrált az oldalon.</div>
          )}
        </dl>
      )}
    </div>
  );
}

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const { id } = await params;
  const { uzenet, hiba } = await searchParams;
  const match = await getMatch(id);
  if (!match) notFound();

  const viewer = await getCurrentProfile();
  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const site = await getSiteUrl();
  const profiles = await getProfilesByKarnyx([match.a.karnyx_name, ...(match.b ? [match.b.karnyx_name] : [])]);
  const proposals = await getProposals(id);
  const open = proposals.filter((p) => p.status === "open");

  const isMine = !!viewer && isParticipant(match, viewer.karnyx_name);
  const isAdmin = !!viewer?.is_admin;
  const active = match.status !== "played" && match.status !== "bye";
  const canAct = (isMine || isAdmin) && active;
  const opponent = isMine ? (sameName(match.a.karnyx_name, viewer?.karnyx_name) ? match.b : match.a) : null;
  const opponentUnregistered = !!opponent && !profileFor(profiles, opponent);

  // Only the side that did not propose can accept; the proposer waits or changes the proposal.
  const proposedByMe = open.length > 0 && open[0].proposed_by === viewer?.id;
  const canAccept = canAct && open.length > 0 && !proposedByMe;
  const proposerName = (profileId: string | null) =>
    [...profiles.values()].find((p) => p.id === profileId)?.karnyx_name ?? "Az admin";

  const now = new Date();
  const deadline = new Date(match.round.deadline);
  const overdue = match.status === "confirmed" && !!match.scheduled_at && new Date(match.scheduled_at) < now;
  const event = match.scheduled_at ? matchEvent(match, site) : null;
  const fbText = `Dice Throne ${match.round.number}. forduló: ${match.a.karnyx_name} vs ${match.b?.karnyx_name}. Egyeztessünk időpontot itt: ${site}/meccs/${match.id}`;

  // Proposals must fall before the round deadline, for admins too. Only the admin
  // "set time" below may go past it.
  const proposeMin = utcToWallTime(now, tz);
  const proposeMax = utcToWallTime(deadline, tz);
  const proposeDays = pickerDays(proposeMin, proposeMax);
  const adminMin = utcToWallTime(new Date(match.round.starts_at), tz);
  const adminMax = utcToWallTime(new Date(deadline.getTime() + WEEK_MS), tz);

  const playedForm = (label: string, className: string) => (
    <form action={markPlayed}>
      <input type="hidden" name="match_id" value={match.id} />
      <button className={className}>{label}</button>
    </form>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="muted text-sm">
          ← Főoldal
        </Link>
        <h1 className="text-2xl font-bold">
          {match.round.number}. forduló · {match.table_no}. asztal
        </h1>
        <StatusBadge status={match.status} />
      </div>
      <p className="muted">Határidő: {formatDateTime(deadline, tz)}</p>

      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      {overdue && canAct && (
        <div className="card flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--accent)" }}>
          <div>
            <div className="font-bold">Elmúlt a megbeszélt időpont</div>
            <div className="muted text-sm">Lejátszottátok? Jelöld itt, az eredményt pedig rögzítsétek a Karnyxban.</div>
          </div>
          {playedForm("✓ Lejátszottuk", "btn")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PlayerCard player={match.a} profile={profileFor(profiles, match.a)} showContacts={!!viewer} />
        <PlayerCard player={match.b} profile={profileFor(profiles, match.b)} showContacts={!!viewer} />
      </div>
      {!viewer && (
        <p className="alert-info">
          <Link href="/login" className="link">
            Lépj be
          </Link>
          , hogy lásd a játékosok Facebook és Discord nevét.
        </p>
      )}

      {canAct && opponentUnregistered && (
        <div className="alert-info flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>{opponent!.karnyx_name}</strong> még nem regisztrált az oldalon, így nem kap Discord értesítést.
            Küldd el neki a linket a Facebook csoportban.
          </span>
          <CopyButton text={fbText} label="Üzenet másolása" />
        </div>
      )}

      {event && match.status === "confirmed" && (
        <div className="card">
          <div className="muted text-sm">Megbeszélt időpont</div>
          <div className="text-2xl font-bold">{formatDateTime(event.start, tz)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn btn-sm" href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
              + Google Naptár
            </a>
            <a className="btn btn-secondary btn-sm" href={`/api/calendar?match=${match.id}`}>
              + Apple / Outlook (.ics)
            </a>
          </div>
        </div>
      )}

      {open.length > 0 && (
        <div className="card">
          <h2 className="font-bold">
            {proposedByMe ? "A te javaslataid" : `${proposerName(open[0].proposed_by)} javasolt időpontjai`}
          </h2>
          <ul className="mt-3 space-y-2">
            {open.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium first-letter:uppercase">{formatDateTime(p.starts_at, tz)}</span>
                {canAccept && (
                  <form action={acceptProposal}>
                    <input type="hidden" name="match_id" value={match.id} />
                    <input type="hidden" name="proposal_id" value={p.id} />
                    <button className="btn btn-sm">Elfogadom</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {proposedByMe && (
            <p className="muted mt-3 text-sm">
              Várakozás {opponent?.karnyx_name ?? "az ellenfél"} válaszára: elfogad egyet, vagy új időpontokat javasol.
            </p>
          )}
        </div>
      )}

      {canAct && (
        <form action={proposeTimes} className="card space-y-3">
          <h2 className="font-bold">
            {match.status === "confirmed"
              ? "Mégsem jó? Javasolj új időpontot (a mostani egyeztetés törlődik)"
              : proposedByMe
                ? "Javaslat módosítása"
                : open.length > 0
                  ? "Egyik sem jó? Javasolj másikat"
                  : "Javasolj időpontokat"}
          </h2>
          <p className="muted text-sm">
            Válassz egy napot, írd be az időt, és add hozzá. Legfeljebb 3 időpontot javasolhatsz{tz !== DEFAULT_TIMEZONE ? ` (${tz} szerint)` : ""}. Az ellenfeled
            kiválaszthat egyet, vagy újat javasolhat.
          </p>
          <input type="hidden" name="match_id" value={match.id} />
          <SlotPicker days={proposeDays} min={proposeMin} max={proposeMax} maxSlots={3} submitLabel="Javaslat küldése" />
        </form>
      )}

      <div className="card flex flex-wrap items-center gap-2">
        <CopyButton text={fbText} label="Üzenet másolása Facebookra" />
        {canAct && !overdue && playedForm("✓ Lejátszottuk", "btn btn-secondary btn-sm")}
      </div>

      {isAdmin && match.status !== "bye" && (
        <details className="card">
          <summary className="cursor-pointer font-bold">Admin</summary>
          <div className="mt-4 space-y-5">
            <form action={adminSetTime} className="space-y-2">
              <input type="hidden" name="match_id" value={match.id} />
              <div className="text-sm font-semibold">Időpont beállítása a játékosok helyett</div>
              <SlotPicker
                days={pickerDays(adminMin, adminMax)}
                min={adminMin}
                max={adminMax}
                maxSlots={1}
                submitLabel="Időpont beállítása"
              />
            </form>
            <div className="flex flex-wrap gap-2">
              {match.status !== "played" && playedForm("Lejátszottnak jelölöm", "btn btn-secondary btn-sm")}
              <form action={adminResetMatch}>
                <input type="hidden" name="match_id" value={match.id} />
                <button className="btn btn-danger btn-sm">Visszaállítás (nincs időpont)</button>
              </form>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
