import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HeroAvatar } from "@/components/HeroAvatar";
import { HeroIcon } from "@/components/HeroIcon";
import { SubmitButton } from "@/components/SubmitButton";
import { getAdminView, requireProfile } from "@/lib/auth";
import { HERO_NAMES } from "@/lib/heroes";
import { routes } from "@/lib/routes";
import { formatDateTime, utcToWallTime } from "@/features/match-organizer/lib/time";
import { avatarPublicUrl } from "@/features/profile/lib/avatar";
import { cancelGame, confirmGame, voidGame } from "@/features/match-reporting/actions/games";
import { GameForm } from "@/features/match-reporting/components/GameForm";
import { canUseMatchReporting } from "@/features/match-reporting/lib/access";
import { getGame, getGameEvents, type GamePlayer } from "@/features/match-reporting/lib/data";
import { fromGame } from "@/features/match-reporting/lib/form";
import { CONTEXT_LABELS, EVENT_LABELS, statusLabel } from "@/features/match-reporting/lib/labels";
import { BACKDATE_DAYS } from "@/features/match-reporting/lib/report";
import { awaitingProfile, gameRights, gameSide } from "@/features/match-reporting/lib/rights";
import { timeLeftToAnswer } from "@/features/match-reporting/lib/timing";
import "@/features/match-reporting/match-reporting.css";

export const metadata: Metadata = { title: "Játszma" };

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const viewer = await requireProfile();
  if (!(await canUseMatchReporting())) redirect(routes.organizer);
  const [{ id }, { uzenet, hiba }] = await Promise.all([params, searchParams]);
  const game = await getGame(id);
  if (!game) notFound();
  const rights = gameRights(game, { id: viewer.id, admin: viewer.is_admin });
  if (!rights.canView) notFound();

  const events = await getGameEvents(game.id);
  const tz = viewer.timezone;
  const side = gameSide(game, viewer.id);
  const status = statusLabel(game, viewer.id);
  const pending = game.status === "pending";
  const awaiting = awaitingProfile(game);
  const reporter = game.reported_side === "a" ? game.a : game.reported_side === "b" ? game.b : null;
  const answerer = awaiting === game.profile_a ? game.a : awaiting === game.profile_b ? game.b : null;
  const nameOf = (pid: string | null) => (pid === game.profile_a ? game.a.name : pid === game.profile_b ? game.b.name : "Admin");
  const opponentName = side === "a" ? game.b.name : game.a.name;
  const now = new Date();
  const minWall = utcToWallTime(new Date(new Date(game.created_at).getTime() - BACKDATE_DAYS * 86_400_000), tz);
  // UI only: admins in "Játékos nézet" see the page as a player (permissions: rights + requireAdmin).
  const adminUi = await getAdminView();
  const showAdmin = adminUi && (rights.canAdminEdit || rights.canVoid);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={routes.gameLog} className="link text-sm">
        ← Játszmáim
      </Link>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      <section className="gr-card">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <h1 className="text-lg font-extrabold">{CONTEXT_LABELS[game.context]} játszma</h1>
          <span className={`badge badge-${status.tone}`}>{status.text}</span>
        </div>
        <div className="gr-head">
          <Side player={game.a} hero={game.hero_a} hp={game.hp_a} ult={game.ult_a} ban={game.ban_a} won={game.outcome === "a"} />
          <span className="gr-mid">{game.outcome === "draw" ? "DÖNTETLEN" : "VS"}</span>
          <Side player={game.b} hero={game.hero_b} hp={game.hp_b} ult={game.ult_b} ban={game.ban_b} won={game.outcome === "b"} />
        </div>
        <div className="gr-meta">
          <span>
            Játszva: <b>{formatDateTime(game.played_at, tz)}</b>
          </span>
          {game.tournament && (
            <span>
              Bajnokság:{" "}
              {game.tournament.slug ? (
                <Link className="link" href={routes.championship(game.tournament.slug)}>
                  {game.tournament.name}
                </Link>
              ) : (
                <b>{game.tournament.name}</b>
              )}
            </span>
          )}
          {pending && (
            <span>
              Jóváhagyásra még: <b>{timeLeftToAnswer(game.reported_at, now)}</b>
            </span>
          )}
        </div>
      </section>

      {pending && rights.canRespond && (
        <section className="gr-card space-y-3 p-4">
          <p className="text-sm">
            <strong>{reporter?.name}</strong> beküldte ezt az eredményt. Ha minden stimmel, fogadd el, és a játszma végleges lesz. Ha
            valami nem jó, javítsd ki: akkor a javításod vár {reporter?.name} jóváhagyására.
          </p>
          <div className="gr-actions">
            <form action={confirmGame}>
              <input type="hidden" name="game_id" value={game.id} />
              <input type="hidden" name="seen" value={game.reported_at} />
              <SubmitButton>Elfogadom</SubmitButton>
            </form>
          </div>
          <details className="gr-correct">
            <summary className="btn btn-secondary">Javítom</summary>
            <div className="mt-4">
              <GameForm
                mode="correct"
                gameId={game.id}
                seen={game.reported_at}
                opponentName={opponentName}
                heroNames={HERO_NAMES}
                myName={side === "a" ? game.a.name : game.b.name}
                maxWall={utcToWallTime(now, tz)}
                minWall={minWall}
                initial={fromGame(game, side!, utcToWallTime(new Date(game.played_at), tz))}
              />
            </div>
          </details>
        </section>
      )}

      {pending && rights.canCancel && (
        <section className="gr-card space-y-3 p-4">
          <p className="text-sm">
            Elküldted, <strong>{answerer?.name}</strong> jóváhagyására vár. Ha tévedés volt, visszavonhatod.
          </p>
          <form action={cancelGame}>
            <input type="hidden" name="game_id" value={game.id} />
            <SubmitButton className="btn btn-secondary" confirm="Biztosan visszavonod ezt a játszmát?">
              Visszavonom
            </SubmitButton>
          </form>
        </section>
      )}

      {showAdmin && (
        <section className="gr-card" aria-labelledby="gr-admin">
          <div className="space-y-3 p-4">
            <h2 id="gr-admin" className="font-extrabold">
              Admin
            </h2>
            <p className="text-sm">
              {pending
                ? "Még nem végleges. Ha elakadt, itt beállíthatod az eredményt (ezzel végleges lesz), vagy érvénytelenítheted."
                : "Végleges játszma. Ha hibás, itt javíthatod, vagy érvénytelenítheted: akkor nem számít bele semmibe."}{" "}
              Az indoklást a játékosok is látják az előzményekben.
            </p>
            {rights.canAdminEdit && (
              <details className="gr-correct">
                <summary className="btn btn-secondary">Eredmény módosítása</summary>
                <div className="mt-4">
                  <GameForm
                    mode="admin"
                    gameId={game.id}
                    myName={game.a.name}
                    opponentName={game.b.name}
                    heroNames={HERO_NAMES}
                    maxWall={utcToWallTime(now, tz)}
                    minWall={minWall}
                    initial={fromGame(game, "a", utcToWallTime(new Date(game.played_at), tz))}
                  />
                </div>
              </details>
            )}
            {rights.canVoid && (
              <details className="gr-correct">
                <summary className="btn btn-secondary">Érvénytelenítés</summary>
                <form action={voidGame} className="mt-4 space-y-3">
                  <input type="hidden" name="game_id" value={game.id} />
                  <label className="block">
                    <span className="label">Indoklás</span>
                    <textarea name="reason" className="input" rows={2} maxLength={300} required />
                  </label>
                  <div className="flex justify-end">
                    <SubmitButton
                      className="btn btn-danger"
                      confirm="Biztosan érvényteleníted ezt a játszmát? Utána nem számít bele semmibe, és nem lehet visszaállítani."
                    >
                      Érvénytelenítem
                    </SubmitButton>
                  </div>
                </form>
              </details>
            )}
            <p className="text-sm">
              <Link href={routes.adminGames} className="link">
                Minden játszma (admin)
              </Link>
            </p>
          </div>
        </section>
      )}

      {adminUi && game.context === "tournament" && (
        <p className="alert-info text-sm">Bajnoki eredményt a bajnokság meccsoldalán lehet módosítani; itt csak megjelenik.</p>
      )}

      {events.length > 0 && (
        <section className="gr-card">
          <h2>Előzmények</h2>
          <ol className="gr-hist">
            {events.map((e) => (
              <li key={e.id}>
                <time dateTime={e.created_at}>{formatDateTime(e.created_at, tz)}</time>
                <span>
                  {EVENT_LABELS[e.kind] ?? e.kind}
                  {e.actor_id && ` · ${nameOf(e.actor_id)}`}
                  {e.reason && ` · „${e.reason}”`}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Side({ player, hero, hp, ult, ban, won }: { player: GamePlayer; hero: string | null; hp: number; ult: number | null; ban: string | null; won: boolean }) {
  return (
    <div className={`gr-side${won ? " won" : ""}`}>
      <Link href={routes.player(player.id)} aria-label={`${player.name} statisztikája`}>
        <HeroAvatar name={player.name} hero={hero} photo={avatarPublicUrl(player.avatar_path)} size="lg" />
      </Link>
      <span className="gr-pname">
        {won && "🏆 "}
        {player.name}
      </span>
      {hero && (
        <span className="gr-hero-line">
          <HeroIcon hero={hero} />
          {hero}
        </span>
      )}
      <span className="gr-hp" aria-label={`${hp} életerő`}>
        {hp}
      </span>
      <small>
        életerő{ult !== null && ` · ${ult} ulti`}
        {ban && ` · kitiltva: ${ban}`}
      </small>
    </div>
  );
}
