import Link from "next/link";
import type { CSSProperties } from "react";
import { HeroIcons } from "@/components/HeroIcon";
import { HeroPicks } from "./HeroPicks";
import { PlayerAvatar } from "@/features/profile/components/PlayerAvatar";
import { StatusBadge } from "@/features/match-organizer/components/StatusBadge";
import { groupMatches } from "@/features/match-organizer/lib/schedule";
import { sideOf } from "@/features/match-organizer/lib/play-mode";
import { formatDateTime, formatShortDate, formatTime } from "@/features/match-organizer/lib/time";
import { heroColors } from "@/lib/heroes";
import { routes } from "@/lib/routes";
import { reportStatus } from "@/features/championships/lib/results";
import type { ChampionshipMatch, MatchReport, Player } from "@/features/championships/lib/types";

// A championship round's matches in the Időpontfoglaló's look (list rows or picture cards), plus
// the result: the winner highlighted with 🏆, the final health instead of "VS", and under each
// name the hero they played and the one that was banned, as icons. Only locked results are shown; a
// submitted one waiting for the opponent shows as "Jóváhagyásra vár".

type Props = {
  matches: ChampionshipMatch[];
  reports: Map<string, MatchReport>;
  timeZone: string;
  viewerName?: string | null;
};

type Result = { winner: "a" | "b" | "draw"; report: MatchReport | null } | null;

/** The locked result of a match, if any (an admin-recorded winner without a report counts too). */
function resultOf(m: ChampionshipMatch, reports: Map<string, MatchReport>): Result {
  const report = reports.get(m.id) ?? null;
  const locked = reportStatus(report) === "locked" ? report : null;
  if (m.is_draw) return { winner: "draw", report: locked };
  if (m.winner_id) return { winner: m.winner_id === m.a.id ? "a" : "b", report: locked };
  return null;
}


function Name({ player, won }: { player: Player; won: boolean }) {
  return (
    <b className={won ? "res-won" : undefined}>
      {won && <span className="res-cup">🏆 </span>}
      {player.karnyx_name}
    </b>
  );
}

function RowSide({ player, side, result }: { player: Player | null; side: "a" | "b"; result: Result }) {
  const cls = `pl ${side === "a" ? "l" : "r"}`;
  if (!player) {
    return (
      <span className={cls}>
        <span className="min-w-0">
          <b>Pihenő</b>
          <small>nincs ellenfél</small>
        </span>
      </span>
    );
  }
  const r = result?.report;
  const lost = !!result && result.winner !== "draw" && result.winner !== side;
  return (
    <span className={`${cls}${lost ? " res-lost" : ""}`}>
      <PlayerAvatar name={player.karnyx_name} hero={(side === "a" ? r?.pick_a : r?.pick_b) ?? player.heroes[0]} />
      <span className="min-w-0">
        <Name player={player} won={result?.winner === side} />
        {r ? <HeroPicks pick={side === "a" ? r.pick_a : r.pick_b} ban={side === "a" ? r.ban_a : r.ban_b} /> : <HeroIcons heroes={player.heroes} />}
      </span>
    </span>
  );
}

function Score({ result }: { result: Result }) {
  if (!result) return <span className="sc">VS</span>;
  if (!result.report) return <span className="sc">{result.winner === "draw" ? "=" : "VÉGE"}</span>;
  return (
    <span className="sc res-score">
      {result.report.hp_a}
      <i>:</i>
      {result.report.hp_b}
    </span>
  );
}

/**
 * Only states that tell the viewer something the row doesn't already show: a draw, a result
 * waiting for confirmation, no agreed time yet. A finished match (score) and an agreed time
 * (the time itself) need no badge.
 */
function ResultBadge({ m, result, report }: { m: ChampionshipMatch; result: Result; report: MatchReport | null }) {
  if (result) return result.winner === "draw" ? <span className="badge badge-played">Döntetlen</span> : null;
  if (reportStatus(report) === "pending") return <span className="badge" style={{ color: "var(--info)" }}>Jóváhagyásra vár</span>;
  if (m.status === "confirmed") return null;
  return <StatusBadge status={m.status} />;
}

function TimeCell({ m, result, timeZone, now }: { m: ChampionshipMatch; result: Result; timeZone: string; now: Date }) {
  const at = m.scheduled_at;
  if (result || m.status === "played") {
    return (
      <span className="tm">
        VÉGE<small>{at ? formatShortDate(at, timeZone) : "lejátszva"}</small>
      </span>
    );
  }
  if (m.status === "confirmed" && at) {
    return (
      <span className="tm">
        {formatTime(at, timeZone)}
        {new Date(at) < now && <small>lejátszásra vár</small>}
      </span>
    );
  }
  if (m.status === "bye") return <span className="tm">—<small>pihenő</small></span>;
  return (
    <span className="tm">
      ?<small>{m.status === "proposed" ? "javaslat vár" : "nincs időpont"}</small>
    </span>
  );
}

/** List view: rows grouped like the Időpontfoglaló (agreed days, open, finished, Bye). */
export function ChampionshipMatchList({ matches, reports, timeZone, viewerName, grouped = true }: Props & { grouped?: boolean }) {
  if (matches.length === 0) return <p className="muted">Nincs meccs.</p>;
  const now = new Date();
  // Finished = has a final result, so the grouping puts them under "Lejátszott".
  const view = matches.map((m) => (resultOf(m, reports) && m.status !== "bye" ? { ...m, status: "played" as const } : m));
  const groups = grouped ? groupMatches(view, timeZone, now) : [{ key: "all", title: "", sub: undefined, matches: view }];

  return (
    <div>
      {groups.map((g) => (
        <section key={g.key}>
          {g.title && (
            <div className="dayh">
              <b>{g.title === "Lejátszott" ? "Eredmények" : g.title}</b>
              {g.sub && <span>{g.sub}</span>}
            </div>
          )}
          {g.matches.map((m) => {
            const result = resultOf(m, reports);
            const mine = !!viewerName && !!sideOf(m, viewerName);
            return (
              <Link key={m.id} href={routes.match(m.id)} className={`mr${mine ? " me" : ""}${m.status === "bye" ? " faded" : ""}`}>
                <TimeCell m={m} result={result} timeZone={timeZone} now={now} />
                <RowSide player={m.a} side="a" result={result} />
                <Score result={result} />
                <RowSide player={m.b} side="b" result={result} />
                <span className="st">
                  <ResultBadge m={m} result={result} report={reports.get(m.id) ?? null} />
                  <small className="muted mt-1 block text-xs">{m.table_no}. asztal</small>
                </span>
                <span className="go" aria-hidden>
                  ›
                </span>
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function CardSide({ player, side, result }: { player: Player | null; side: "a" | "b"; result: Result }) {
  if (!player) {
    return (
      <div className="p">
        <PlayerAvatar name={null} size="md" />
        <b>Pihenő</b>
        <small>nincs ellenfél</small>
      </div>
    );
  }
  const r = result?.report;
  const lost = !!result && result.winner !== "draw" && result.winner !== side;
  return (
    <div className={`p${lost ? " res-lost" : ""}`}>
      <PlayerAvatar name={player.karnyx_name} hero={(side === "a" ? r?.pick_a : r?.pick_b) ?? player.heroes[0]} size="md" />
      <Name player={player} won={result?.winner === side} />
      {r ? (
        <HeroPicks pick={side === "a" ? r.pick_a : r.pick_b} ban={side === "a" ? r.ban_a : r.ban_b} />
      ) : (
        <HeroIcons heroes={player.heroes} />
      )}
    </div>
  );
}

// Fixed colours: tiles are always dark, whatever the page theme (as in the Időpontfoglaló).
const CHIP = {
  draw: { label: "Döntetlen", color: "#b9b8c4" },
  awaiting: { label: "Jóváhagyásra vár", color: "#6e9fd6" },
  overdue: { label: "Elmúlt, eredményre vár", color: "#d4ab52" },
  proposed: { label: "Időpont javasolva", color: "#e0a63a" },
  pending: { label: "Nincs időpont", color: "#ff7a70" },
  bye: { label: "Bye", color: "#b9b8c4" },
};

/** Card view: one picture tile per match in the played (or first) heroes' colours. */
export function ChampionshipMatchCards({ matches, reports, timeZone, viewerName }: Props) {
  const now = new Date();
  return (
    <div className="cards">
      {matches.map((m) => {
        const result = resultOf(m, reports);
        const report = reports.get(m.id) ?? null;
        // No chip for a finished match (the score shows it) or an agreed time still ahead (the time shows it).
        const chip = result
          ? result.winner === "draw"
            ? CHIP.draw
            : null
          : m.status === "bye"
            ? CHIP.bye
            : reportStatus(report) === "pending"
              ? CHIP.awaiting
              : m.status === "confirmed"
                ? m.scheduled_at && new Date(m.scheduled_at) < now
                  ? CHIP.overdue
                  : null
                : CHIP[m.status === "proposed" ? "proposed" : "pending"];
        const [c1] = heroColors(result?.report?.pick_a ?? m.a.heroes[0]);
        const [c2] = heroColors(result?.report?.pick_b ?? m.b?.heroes[0]);
        const mine = !!viewerName && !!sideOf(m, viewerName);
        return (
          <Link key={m.id} href={routes.match(m.id)} className={`tile tile-match${mine ? " me" : ""}${m.status === "bye" ? " faded" : ""}`}>
            <div className="img ph-art" style={{ "--c1": c1, "--c2": c2 } as CSSProperties} />
            <span className="badge-tl tile-no">#{m.table_no}</span>
            {chip && (
              <span className="badge-tr">
                <span className="badge" style={{ color: chip.color }}>
                  {chip.label}
                </span>
              </span>
            )}
            <div className="in">
              <div className="vsbox">
                <CardSide player={m.a} side="a" result={result} />
                {result?.report ? (
                  <span className="vsx res-score">
                    {result.report.hp_a}
                    <i>:</i>
                    {result.report.hp_b}
                  </span>
                ) : (
                  <span className="vsx">VS</span>
                )}
                <CardSide player={m.b} side="b" result={result} />
              </div>
              <div className="foot">
                {mine && <small className="tile-mine">a te meccsed</small>}
                {result ? (
                  <span>{result.winner === "draw" ? "Döntetlen" : `${result.winner === "a" ? m.a.karnyx_name : m.b?.karnyx_name} nyert`}</span>
                ) : m.scheduled_at && m.status === "confirmed" ? (
                  <span className="font-semibold first-letter:uppercase">{formatDateTime(m.scheduled_at, timeZone)}</span>
                ) : m.status === "bye" ? (
                  <span>Nincs teendő</span>
                ) : (
                  <span>{m.status === "proposed" ? "Időpont javaslat vár válaszra" : "Még nincs időpont"}</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
