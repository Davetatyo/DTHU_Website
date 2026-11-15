import Link from "next/link";
import { HeroIcon } from "@/components/HeroIcon";
import { routes } from "@/lib/routes";
import { formatShortDate } from "@/features/match-organizer/lib/time";
import type { GameView } from "../lib/data";
import { CONTEXT_LABELS, statusLabel } from "../lib/labels";
import { FIRST_REMINDER_HOURS } from "../lib/timing";
import "../match-reporting.css";

const HOUR_MS = 3_600_000;

/** One game in the admin list: both players (winner first marked), health, status, how long it waits. */
export function AdminGameRow({ game, adminId, timeZone, now }: { game: GameView; adminId: string; timeZone: string; now: Date }) {
  const status = statusLabel(game, adminId);
  const waitingHours = game.status === "pending" ? (now.getTime() - new Date(game.reported_at).getTime()) / HOUR_MS : 0;
  const mark = (side: "a" | "b") => (game.outcome === side ? "🏆 " : "");

  return (
    <Link href={routes.gameView(game.id)} className="gr-row">
      <span className="gr-when">
        <b>{formatShortDate(game.played_at, timeZone)}</b>
        <small>{CONTEXT_LABELS[game.context]}</small>
      </span>
      <span className="gr-vs">
        <span className="gr-heroes" aria-hidden>
          {game.hero_a && <HeroIcon hero={game.hero_a} />}
          {game.hero_b && <HeroIcon hero={game.hero_b} />}
        </span>
        <span className="min-w-0">
          <span className="gr-name">
            {mark("a")}
            {game.a.name} – {mark("b")}
            {game.b.name}
          </span>
          <small className="muted">
            {game.outcome === "draw" ? "Döntetlen · " : ""}
            {game.hp_a} – {game.hp_b} életerő
            {game.status === "pending" && (
              <span className={waitingHours >= FIRST_REMINDER_HOURS ? " gr-stuck" : ""}> · {Math.floor(waitingHours / 24)} napja vár</span>
            )}
            <span className="sr-only">
              {" "}
              ({game.a.name}: {game.hero_a ?? "?"}, {game.b.name}: {game.hero_b ?? "?"})
            </span>
          </small>
        </span>
      </span>
      <span className={`badge badge-${status.tone}`}>{status.text}</span>
    </Link>
  );
}
