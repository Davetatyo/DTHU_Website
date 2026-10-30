import { routes } from "@/lib/routes";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { SlotPicker } from "@/features/match-organizer/components/SlotPicker";
import { StatusBadge } from "@/features/match-organizer/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { InfoTip } from "@/components/InfoTip";
import { getCurrentProfile, sameName } from "@/lib/auth";
import { matchEvent } from "@/features/match-organizer/lib/calendar";
import { getMatch, getProfilesByKarnyx, getProposals, getSwapSuggestions, isParticipant, profileFor } from "@/features/match-organizer/lib/data";
import { googleCalendarUrl } from "@/features/match-organizer/lib/ics";
import { getSiteUrl } from "@/lib/site";
import { DEFAULT_TIMEZONE, formatDateTime, pickerDays, utcToWallTime } from "@/features/match-organizer/lib/time";
import type { Player, Profile } from "@/features/match-organizer/lib/types";
import { acceptProposal, adminReplacePlayer, adminResetMatch, adminSetTime, markPlayed, proposeTimes } from "@/features/match-organizer/actions/match";

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
  const canSwap = isAdmin && match.status !== "played" && match.status !== "bye" && !match.round.closed_at;
  const swapSuggestions = canSwap ? await getSwapSuggestions(match) : [];
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
  const fbText = `Dice Throne ${match.round.number}. forduló: ${match.a.karnyx_name} vs ${match.b?.karnyx_name}. Egyeztessünk időpontot itt: ${site}${routes.match(match.id)}`;

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
      <SubmitButton className={className}>{label}</SubmitButton>
    </form>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={routes.organizer} className="muted text-sm">
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

      {/* Main actions first: the big green "played" button, the Facebook copy as a quiet helper. */}
      {match.status !== "bye" && (
        <div
          className="card flex flex-wrap items-center gap-3"
          style={overdue && canAct ? { borderColor: "var(--ok-solid)" } : undefined}
        >
          {overdue && canAct && (
            <p className="w-full text-sm">
              <strong>Elmúlt a megbeszélt időpont.</strong> Ha lejátszottátok, jelöld itt, az eredményt pedig
              rögzítsétek a Karnyxban.
            </p>
          )}
          {canAct && (
            <span className="inline-flex items-center">
              {playedForm("✓ Lejátszottuk", "btn btn-played")}
              <InfoTip text="Nyomd meg, ha a meccs megvolt. Bármelyikőtök jelölheti. Az eredményt továbbra is a Karnyxba írjátok be." />
            </span>
          )}
          <span className="inline-flex items-center">
            <CopyButton text={fbText} label="Üzenet másolása Facebookra" className="btn btn-sm btn-quiet" />
            <InfoTip text="Kimásol egy kész üzenetet a meccs linkjével, amit beilleszthetsz a Facebook csoportba. Hasznos, ha az ellenfeled még nem regisztrált az oldalon." />
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PlayerCard player={match.a} profile={profileFor(profiles, match.a)} showContacts={!!viewer} />
        <PlayerCard player={match.b} profile={profileFor(profiles, match.b)} showContacts={!!viewer} />
      </div>
      {!viewer && (
        <p className="alert-info">
          <Link href={routes.login} className="link">
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
          <div className="muted text-sm">
            Megbeszélt időpont
            <InfoTip text="A meccs megerősítve. Add hozzá a naptáradhoz. Ha mégsem jó, lent javasolj új időpontot: ekkor újra az ellenfeled választ." />
          </div>
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
            <InfoTip text="Mindig a másik fél választ egyet az Elfogadom gombbal. Ha valamelyikőtök új időpontokat küld, ezek érvényüket vesztik." />
          </h2>
          <ul className="mt-3 space-y-2">
            {open.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium first-letter:uppercase">{formatDateTime(p.starts_at, tz)}</span>
                {canAccept && (
                  <form action={acceptProposal}>
                    <input type="hidden" name="match_id" value={match.id} />
                    <input type="hidden" name="proposal_id" value={p.id} />
                    <SubmitButton className="btn btn-sm">Elfogadom</SubmitButton>
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
            <InfoTip text="Legfeljebb 3 időpont, a forduló határidejéig. Ha az ellenfeled regisztrált, Discordon jelölést kap, és kiválaszt egyet vagy újat javasol." />
          </h2>
          <p className="muted text-sm">
            Válassz egy napot, írd be az időt, és add hozzá. Legfeljebb 3 időpontot javasolhatsz{tz !== DEFAULT_TIMEZONE ? ` (${tz} szerint)` : ""}. Az ellenfeled
            kiválaszthat egyet, vagy újat javasolhat.
          </p>
          <input type="hidden" name="match_id" value={match.id} />
          <SlotPicker days={proposeDays} min={proposeMin} max={proposeMax} maxSlots={3} submitLabel="Javaslat küldése" />
        </form>
      )}

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
            {canSwap && (
              <form action={adminReplacePlayer} className="space-y-2">
                <input type="hidden" name="match_id" value={match.id} />
                <div className="text-sm font-semibold">
                  Játékos cseréje
                  <InfoTip text="Ha valaki kiesik, itt cserélheted egy másik játékosra. Ha az új játékos ebben a fordulóban Bye-on van, a Bye törlődik. A kieső játékos kérésre Bye-t kaphat. Az időpont egyeztetés újraindul, és Discordon megjelöljük az új párost." />
                </div>
                <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <legend className="muted mb-1 text-xs">Ki esik ki?</legend>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="slot" value="a" defaultChecked /> {match.a.karnyx_name}
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="slot" value="b" /> {match.b?.karnyx_name}
                  </label>
                </fieldset>
                <input
                  name="new_player"
                  list="swap-players"
                  className="input max-w-sm"
                  placeholder="Új játékos Karnyx neve"
                  autoComplete="off"
                  maxLength={40}
                  required
                />
                <datalist id="swap-players">
                  {swapSuggestions.map((s) => (
                    <option key={s.name} value={s.name} label={s.note} />
                  ))}
                </datalist>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="give_bye" /> A kieső játékos Bye-t kap (pihen ebben a fordulóban)
                </label>
                <SubmitButton
                  className="btn btn-sm"
                  confirm="Biztosan cseréled a játékost? Az időpont egyeztetés újraindul."
                >
                  Csere
                </SubmitButton>
              </form>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={adminResetMatch}>
                <input type="hidden" name="match_id" value={match.id} />
                <SubmitButton className="btn btn-danger btn-sm">Visszaállítás (nincs időpont)</SubmitButton>
              </form>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
