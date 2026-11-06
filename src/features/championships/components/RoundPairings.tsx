import Link from "next/link";
import { routes } from "@/lib/routes";
import { HeroAvatar } from "@/components/HeroAvatar";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import { sideOf } from "@/features/match-organizer/lib/play-mode";
import { reportRights, reportStatus, resultButtonLabel } from "@/features/championships/lib/results";
import type { ChampionshipMatch, MatchReport, Player } from "@/features/championships/lib/types";
import { ResultPanel } from "./ResultPanel";

function Side({ player, won, pick, ban }: { player: Player; won: boolean; pick?: string | null; ban?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {pick && (
        <span className="hidden sm:inline-flex">
          <HeroAvatar name={pick} hero={pick} />
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate font-semibold" style={won ? { color: "var(--ok)" } : undefined}>
          {won && "🏆 "}
          {player.karnyx_name}
        </div>
        {pick ? (
          <div className="res-chips">
            <span className="truncate">{pick}</span>
            {ban && (
              <span className="truncate" title={`Kitiltva: ${ban}`}>
                <s>{ban}</s>
              </span>
            )}
          </div>
        ) : (
          player.heroes.length > 0 && <div className="muted truncate text-xs">{player.heroes.join(", ")}</div>
        )}
      </div>
    </div>
  );
}

/**
 * A round's matches. Players get a result button on their own match, admins (admin view) on
 * every match. The viewer's own match is highlighted and has a button to the Időpontfoglaló's
 * match page, where the two players agree on a time.
 */
export function RoundPairings({
  matches,
  reports,
  timeZone,
  viewerName,
  adminView,
  back,
}: {
  matches: ChampionshipMatch[];
  reports: Map<string, MatchReport>;
  timeZone: string;
  viewerName?: string | null;
  adminView: boolean;
  back: string;
}) {
  const games = matches.filter((m) => m.b);
  const byes = matches.filter((m) => !m.b);

  return (
    <div className="space-y-2">
      {games.map((m) => {
        const b = m.b!;
        const report = reports.get(m.id) ?? null;
        const status = reportStatus(report);
        const side = sideOf(m, viewerName);
        const rights = reportRights(report, { side, admin: adminView });
        const showPanel = rights.canSubmit || rights.canConfirm;
        const shown = status === "locked" ? report : null;
        const decided = !!m.winner_id || !!m.is_draw;
        return (
          <div
            key={m.id}
            className="space-y-2 rounded-lg p-3"
            style={{ background: "var(--surface-2)", outline: side ? "2px solid var(--accent)" : undefined }}
          >
            <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-3">
              <span className="muted text-sm tabular-nums">{m.table_no}.</span>
              <Side player={m.a} won={m.winner_id === m.a.id} pick={shown?.pick_a} ban={shown?.ban_a} />
              <span className="muted text-center text-xs tabular-nums">
                {shown ? (
                  <strong className="text-sm" style={{ color: "var(--fg)" }}>
                    {shown.hp_a} : {shown.hp_b}
                  </strong>
                ) : (
                  "vs"
                )}
              </span>
              <Side player={b} won={m.winner_id === b.id} pick={shown?.pick_b} ban={shown?.ban_b} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="muted">
                {status === "locked" ? (
                  <span className="badge badge-confirmed">{m.is_draw ? "Döntetlen" : "Végeredmény"}</span>
                ) : status === "pending" ? (
                  <span className="badge badge-proposed">Jóváhagyásra vár</span>
                ) : decided ? (
                  "Eredmény rögzítve"
                ) : m.scheduled_at ? (
                  `Időpont: ${formatDateTime(m.scheduled_at, timeZone)}`
                ) : (
                  "Nincs még időpont"
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                {side && status !== "locked" && !decided && (
                  <Link href={routes.match(m.id)} className="btn btn-sm btn-secondary">
                    {m.scheduled_at ? "Időpont módosítása" : "Időpont egyeztetés"}
                  </Link>
                )}
                {showPanel && (
                  <ResultPanel
                    matchId={m.id}
                    back={back}
                    a={{ name: m.a.karnyx_name, heroes: m.a.heroes }}
                    b={{ name: b.karnyx_name, heroes: b.heroes }}
                    report={report}
                    viewerSide={side}
                    {...rights}
                    label={resultButtonLabel(status, rights)}
                    highlight={rights.canConfirm || (status === "none" && !!side)}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
      {byes.map((m) => (
        <div key={m.id} className="rounded-lg p-3 text-sm" style={{ background: "var(--surface-2)" }}>
          <span className="muted">Bye:</span> <strong>{m.a.karnyx_name}</strong> <span className="muted">pihen, és kap 1 pontot</span>
        </div>
      ))}
    </div>
  );
}

