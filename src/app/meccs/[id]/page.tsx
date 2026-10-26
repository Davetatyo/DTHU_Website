import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentProfile } from "@/lib/auth";
import { matchEvent } from "@/lib/calendar";
import { getMatch, getProfilesByKarnyx, getProposals, isParticipant, profileFor } from "@/lib/data";
import { googleCalendarUrl } from "@/lib/ics";
import { getSiteUrl } from "@/lib/site";
import { DEFAULT_TIMEZONE, formatDateTime, utcToWallTime } from "@/lib/time";
import type { Player, Profile } from "@/lib/types";
import { acceptProposal, adminResetMatch, adminSetTime, markPlayed, proposeTimes } from "./actions";

function PlayerCard({ player, profile, showContacts }: { player: Player | null; profile: Profile | null; showContacts: boolean }) {
  if (!player) return <div className="card muted">Erőnyerő kör, nincs ellenfél.</div>;
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
  const canAccept = canAct && open.length > 0 && (isAdmin || open[0].proposed_by !== viewer?.id);
  const proposerName = (profileId: string | null) =>
    [...profiles.values()].find((p) => p.id === profileId)?.karnyx_name ?? "Admin";

  const now = new Date();
  const deadline = new Date(match.round.deadline);
  const event = match.scheduled_at ? matchEvent(match, site) : null;
  const fbText = `Dice Throne ${match.round.number}. forduló: ${match.a.karnyx_name} vs ${match.b?.karnyx_name}. Egyeztessünk időpontot itt: ${site}/meccs/${match.id}`;

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
          <h2 className="font-bold">{proposerName(open[0].proposed_by)} javasolt időpontjai</h2>
          <ul className="mt-3 space-y-2">
            {open.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{formatDateTime(p.starts_at, tz)}</span>
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
          {canAct && !canAccept && <p className="muted mt-3 text-sm">Várakozás az ellenfeled válaszára.</p>}
        </div>
      )}

      {canAct && (
        <form action={proposeTimes} className="card space-y-3">
          <h2 className="font-bold">
            {match.status === "confirmed"
              ? "Új időpontot javaslok (a mostani egyeztetés törlődik)"
              : open.length > 0
                ? "Egyik sem jó? Javasolj másikat"
                : "Javasolj időpontokat"}
          </h2>
          <p className="muted text-sm">
            Adj meg 1–3 időpontot ({tz} szerint). Az ellenfeled kiválaszthat egyet.
          </p>
          <input type="hidden" name="match_id" value={match.id} />
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              type="datetime-local"
              name="slot"
              className="input"
              required={i === 0}
              min={utcToWallTime(now, tz)}
              max={isAdmin ? undefined : utcToWallTime(deadline, tz)}
            />
          ))}
          <button className="btn">Javaslat küldése</button>
        </form>
      )}

      <div className="card flex flex-wrap items-center gap-2">
        <CopyButton text={fbText} label="Üzenet másolása Facebookra" />
        {canAct && (
          <form action={markPlayed}>
            <input type="hidden" name="match_id" value={match.id} />
            <button className="btn btn-secondary btn-sm">✓ Lejátszottuk</button>
          </form>
        )}
      </div>

      {isAdmin && match.status !== "bye" && (
        <div className="card space-y-3">
          <h2 className="font-bold">Admin</h2>
          <form action={adminSetTime} className="flex flex-wrap gap-2">
            <input type="hidden" name="match_id" value={match.id} />
            <input
              type="datetime-local"
              name="time"
              className="input max-w-xs"
              required
              defaultValue={match.scheduled_at ? utcToWallTime(new Date(match.scheduled_at), tz) : undefined}
            />
            <button className="btn btn-sm">Időpont beállítása</button>
          </form>
          <form action={adminResetMatch}>
            <input type="hidden" name="match_id" value={match.id} />
            <button className="btn btn-danger btn-sm">Visszaállítás (nincs időpont)</button>
          </form>
        </div>
      )}
    </div>
  );
}
