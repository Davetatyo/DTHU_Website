import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateTime, timeLeft } from "@/features/match-organizer/lib/time";
import { enterDraw } from "../actions/draws";
import { drawPhase, firstPickChance, maxEntry } from "../lib/draw";
import type { Draw, DrawStats } from "../lib/types";


const PHASE_CHIP = {
  open: ["ok", "Nyitott"],
  closing: ["warn", "Sorsolás folyamatban"],
  drawn: ["info", "Kisorsolva"],
  cancelled: ["mut", "Elmaradt"],
} as const;

/**
 * One draw: prize, closing time, entries and (when open and signed in) the entry form.
 * `balance` is null for anonymous visitors.
 */
export function DrawCard({
  draw,
  stats,
  balance,
  timeZone,
}: {
  draw: Draw;
  stats: DrawStats;
  balance: number | null;
  timeZone?: string;
}) {
  const phase = drawPhase(draw);
  const [chipClass, chipText] = PHASE_CHIP[phase];
  const canPut = balance == null ? 0 : maxEntry(balance, stats.mine, draw.max_tickets_per_player);
  const chance = firstPickChance(stats.mine, stats.tickets);

  return (
    <section className={`card space-y-3 ${stats.iWon ? "draw-won" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xl font-bold">{draw.title}</h3>
          <p className="draw-prize">🎁 {draw.prize}</p>
        </div>
        <span className={`chip ${chipClass}`}>{chipText}</span>
      </div>
      {draw.description && <p className="muted text-sm whitespace-pre-line">{draw.description}</p>}

      <dl className="draw-stats">
        <div>
          <dt>{phase === "open" ? "Zárás" : "Zárult"}</dt>
          <dd>
            {formatDateTime(draw.closes_at, timeZone)}
            {phase === "open" && <span className="muted"> · még {timeLeft(draw.closes_at)}</span>}
          </dd>
        </div>
        <div>
          <dt>Nevezők</dt>
          <dd>
            {stats.entrants} játékos · {stats.tickets} jegy
          </dd>
        </div>
        <div>
          <dt>Nyertesek</dt>
          <dd>
            {draw.winner_count}
            {draw.max_tickets_per_player != null && (
              <span className="muted"> · max. {draw.max_tickets_per_player} jegy/fő</span>
            )}
          </dd>
        </div>
        {stats.mine > 0 && (
          <div>
            <dt>A te jegyeid</dt>
            <dd>
              {stats.mine} jegy
              {phase !== "drawn" && phase !== "cancelled" && (
                <span className="muted"> · most {Math.round(chance * 100)}% esély</span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {phase === "drawn" && (
        <div className="draw-winners">
          <span className="font-bold">{stats.winners.length > 1 ? "Nyertesek:" : "Nyertes:"}</span>{" "}
          {stats.winners.length === 0 ? (
            <span className="muted">senki sem nevezett</span>
          ) : (
            stats.winners.map((name, i) => (
              <span key={i} className="draw-winner">
                {stats.winners.length > 1 && `${i + 1}. `}
                {name}
              </span>
            ))
          )}
          {stats.iWon && <p className="mt-1 font-bold">🎉 Nyertél! A szervezők jelentkeznek a nyereményeddel.</p>}
        </div>
      )}
      {phase === "cancelled" && <p className="muted text-sm">A sorsolás elmaradt, a betett jegyeket mindenki visszakapta.</p>}
      {phase === "closing" && (
        <p className="muted text-sm">A nevezés lezárult. A sorsolás egy órán belül automatikusan lefut.</p>
      )}

      {phase === "open" &&
        (balance == null ? (
          <p className="muted text-sm">Lépj be a nevezéshez.</p>
        ) : canPut === 0 ? (
          <p className="muted text-sm">
            {balance === 0 ? "Nincs jegyed, amivel nevezhetnél." : "Elérted a jegylimitet ebben a sorsolásban."}
          </p>
        ) : (
          <form action={enterDraw} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="draw_id" value={draw.id} />
            <div>
              <label className="label" htmlFor={`tickets-${draw.id}`}>
                Hány jegyet teszel be?
                <InfoTip text="Minden jegy egy nevezés: minél több jegyet teszel be, annál nagyobb az esélyed. A betett jegyet nem kapod vissza (csak ha a sorsolás elmarad). Egy játékos legfeljebb egyszer nyerhet." />
              </label>
              <input
                id={`tickets-${draw.id}`}
                name="tickets"
                type="number"
                inputMode="numeric"
                min={1}
                max={canPut}
                defaultValue={1}
                className="input w-28"
                required
              />
            </div>
            <SubmitButton confirm={`Beteszed a jegyeidet a(z) „${draw.title}” sorsolásba? A betett jegyet nem kapod vissza.`}>
              🎟️ Nevezek
            </SubmitButton>
            <span className="muted text-xs">legfeljebb {canPut}</span>
          </form>
        ))}
    </section>
  );
}
