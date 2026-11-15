import Link from "next/link";
import { HeroIcon } from "@/components/HeroIcon";
import { routes } from "@/lib/routes";
import { formatShortDate } from "@/features/match-organizer/lib/time";
import type { GameView } from "../lib/data";
import { resultFor } from "../lib/form";
import { CONTEXT_LABELS, RESULT_LABELS, statusLabel } from "../lib/labels";
import { gameSide } from "../lib/rights";
import "../match-reporting.css";

/** One game in the Játszmáim list, from the viewer's side. */
export function GameRow({ game, viewerId, timeZone }: { game: GameView; viewerId: string; timeZone: string }) {
  const side = gameSide(game, viewerId);
  const me = side === "b" ? game.b : game.a;
  const opp = side === "b" ? game.a : game.b;
  const myHero = side === "b" ? game.hero_b : game.hero_a;
  const oppHero = side === "b" ? game.hero_a : game.hero_b;
  const result = resultFor(game, side);
  const status = statusLabel(game, viewerId);
  const shown = game.status === "finalized" || game.status === "pending";

  return (
    <Link href={routes.gameView(game.id)} className={`gr-row${result && game.status === "finalized" ? ` ${result}` : ""}`}>
      <span className="gr-when">
        <b>{formatShortDate(game.played_at, timeZone)}</b>
        <small>{CONTEXT_LABELS[game.context]}</small>
      </span>
      <span className="gr-vs">
        <span className="gr-heroes" aria-hidden>
          {myHero && <HeroIcon hero={myHero} />}
          {oppHero && <HeroIcon hero={oppHero} />}
        </span>
        <span className="min-w-0">
          <span className="gr-name">vs. {opp.name}</span>
          <small className="muted">
            {shown && result ? `${RESULT_LABELS[result]} · ` : ""}
            {side === "b" ? `${game.hp_b} – ${game.hp_a}` : `${game.hp_a} – ${game.hp_b}`} életerő
            <span className="sr-only">
              {" "}
              ({me.name}: {myHero ?? "?"}, {opp.name}: {oppHero ?? "?"})
            </span>
          </small>
        </span>
      </span>
      <span className={`badge badge-${status.tone}`}>{status.text}</span>
    </Link>
  );
}
