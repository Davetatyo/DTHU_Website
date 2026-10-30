import Link from "next/link";
import { HeroAvatar } from "@/components/HeroAvatar";
import { sameName } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { groupMatches } from "@/features/match-organizer/lib/schedule";
import { formatShortDate, formatTime } from "@/features/match-organizer/lib/time";
import type { MatchView, Player } from "@/features/match-organizer/lib/types";
import { StatusBadge } from "./StatusBadge";

function Side({ player, side }: { player: Player | null; side: "l" | "r" }) {
  if (!player) {
    return (
      <span className={`pl ${side}`}>
        <span className="min-w-0">
          <b>Pihenő</b>
          <small>nincs ellenfél</small>
        </span>
      </span>
    );
  }
  return (
    <span className={`pl ${side}`}>
      <HeroAvatar name={player.karnyx_name} hero={player.heroes[0]} />
      <span className="min-w-0">
        <b>{player.karnyx_name}</b>
        {player.heroes.length > 0 && <small>{player.heroes.slice(0, 2).join(" · ")}</small>}
      </span>
    </span>
  );
}

function TimeCell({ match, timeZone, now }: { match: MatchView; timeZone: string; now: Date }) {
  const at = match.scheduled_at;
  if (match.status === "confirmed" && at) {
    const past = new Date(at) < now;
    return (
      <span className="tm">
        {formatTime(at, timeZone)}
        <small>{past ? "lejátszásra vár" : "megerősítve"}</small>
      </span>
    );
  }
  if (match.status === "played") {
    return (
      <span className="tm">
        VÉGE<small>{at ? formatShortDate(at, timeZone) : "lejátszva"}</small>
      </span>
    );
  }
  if (match.status === "bye") return <span className="tm">—<small>pihenő</small></span>;
  return (
    <span className="tm">
      ?<small>{match.status === "proposed" ? "javaslat vár" : "nincs időpont"}</small>
    </span>
  );
}

/** One match as a row: time, both players with their hero, status. */
export function MatchRow({ match, timeZone, mine, now }: { match: MatchView; timeZone: string; mine: boolean; now: Date }) {
  const faded = match.status === "played" || match.status === "bye";
  return (
    <Link href={routes.match(match.id)} className={`mr${mine ? " me" : ""}${faded ? " faded" : ""}`}>
      <TimeCell match={match} timeZone={timeZone} now={now} />
      <Side player={match.a} side="l" />
      <span className="sc">VS</span>
      <Side player={match.b} side="r" />
      <span className="st">
        <StatusBadge status={match.status} />
        <small className="muted mt-1 block text-xs">{match.table_no}. asztal</small>
      </span>
      <span className="go" aria-hidden>
        ›
      </span>
    </Link>
  );
}

/** A round's matches as rows, grouped by day (agreed times), then open, played and Bye. */
export function MatchList({
  matches,
  timeZone,
  highlight,
  grouped = true,
}: {
  matches: MatchView[];
  timeZone: string;
  highlight?: string | null;
  grouped?: boolean;
}) {
  if (matches.length === 0) return <p className="muted">Nincs meccs.</p>;
  const now = new Date();
  const mine = (m: MatchView) => sameName(m.a.karnyx_name, highlight) || sameName(m.b?.karnyx_name, highlight);
  const groups = grouped ? groupMatches(matches, timeZone, now) : [{ key: "all", title: "", sub: undefined, matches }];

  return (
    <div>
      {groups.map((g) => (
        <section key={g.key}>
          {g.title && (
            <div className="dayh">
              <b>{g.title}</b>
              {g.sub && <span>{g.sub}</span>}
            </div>
          )}
          {g.matches.map((m) => (
            <MatchRow key={m.id} match={m} timeZone={timeZone} mine={mine(m)} now={now} />
          ))}
        </section>
      ))}
    </div>
  );
}
