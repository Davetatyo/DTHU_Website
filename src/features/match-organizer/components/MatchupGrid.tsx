import Link from "next/link";
import type { CSSProperties } from "react";
import { HeroAvatar } from "@/components/HeroAvatar";
import { sameName } from "@/lib/auth";
import { heroColors } from "@/lib/heroes";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import type { MatchView, Player } from "@/features/match-organizer/lib/types";

// Round overview (home page and admin): one picture tile per match in the two players' hero
// colours, with a chip showing how far the pair got with scheduling.

type CardState = "pending" | "proposed" | "confirmed" | "overdue" | "played" | "bye";

// Fixed colours: tiles are always dark, whatever the page theme.
const STATE: Record<CardState, { label: string; color: string }> = {
  pending: { label: "Nincs időpont", color: "#ff7a70" },
  proposed: { label: "Időpont javasolva", color: "#e0a63a" },
  confirmed: { label: "Megerősítve", color: "#3fbf6f" },
  overdue: { label: "Elmúlt, lejátszásra vár", color: "#d4ab52" },
  played: { label: "Lejátszva", color: "#b9b8c4" },
  bye: { label: "Bye", color: "#b9b8c4" },
};

function cardState(match: MatchView, now: Date): CardState {
  if (match.status === "confirmed" && match.scheduled_at && new Date(match.scheduled_at) < now) return "overdue";
  return match.status;
}

function Side({ player, registered }: { player: Player | null; registered: (p: Player) => boolean }) {
  if (!player) {
    return (
      <div className="p">
        <HeroAvatar name={null} size="md" />
        <b>Pihenő</b>
        <small>nincs ellenfél</small>
      </div>
    );
  }
  const ok = registered(player);
  return (
    <div className="p">
      <HeroAvatar name={player.karnyx_name} hero={player.heroes[0]} size="md" />
      <b>
        <span
          className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
          style={{ background: ok ? "#3fbf6f" : "#55556a" }}
          title={ok ? "Regisztrált" : "Még nem regisztrált"}
        />
        {player.karnyx_name}
      </b>
      {player.heroes.length > 0 && <small>{player.heroes[0]}</small>}
    </div>
  );
}

export function MatchupGrid({
  matches,
  timeZone,
  registeredNames,
  openProposalCounts,
  highlight,
}: {
  matches: MatchView[];
  timeZone: string;
  registeredNames: Set<string>;
  openProposalCounts: Map<string, number>;
  /** Karnyx name of the viewer: their own match gets a gold outline. */
  highlight?: string | null;
}) {
  const now = new Date();
  const registered = (p: Player) => registeredNames.has(p.karnyx_name.toLowerCase());
  const isMine = (m: MatchView) => sameName(m.a.karnyx_name, highlight) || sameName(m.b?.karnyx_name, highlight);

  return (
    <div className="space-y-3">
      <div className="muted flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {(Object.keys(STATE) as CardState[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STATE[s].color }} />
            {STATE[s].label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#3fbf6f" }} /> regisztrált játékos
        </span>
      </div>

      <div className="cards">
        {matches.map((m) => {
          const state = cardState(m, now);
          const proposals = openProposalCounts.get(m.id) ?? 0;
          const faded = state === "played" || state === "bye";
          const [c1] = heroColors(m.a.heroes[0]);
          const [c2] = heroColors(m.b?.heroes[0]);
          return (
            <Link key={m.id} href={routes.match(m.id)} className={`tile${isMine(m) ? " me" : ""}${faded ? " faded" : ""}`}>
              <div className="img ph-art" style={{ "--c1": c1, "--c2": c2 } as CSSProperties} />
              <span className="badge-tl tile-no">
                #{m.table_no}
                {isMine(m) ? " · a te meccsed" : ""}
              </span>
              <span className="badge-tr">
                <span className="badge" style={{ color: STATE[state].color }}>
                  {STATE[state].label}
                </span>
              </span>
              <div className="in">
                <div className="vsbox">
                  <Side player={m.a} registered={registered} />
                  <span className="vsx">VS</span>
                  <Side player={m.b} registered={registered} />
                </div>
                <div className="foot">
                  {m.scheduled_at && (state === "confirmed" || state === "overdue" || state === "played") ? (
                    <span className="font-semibold first-letter:uppercase">{formatDateTime(m.scheduled_at, timeZone)}</span>
                  ) : state === "proposed" ? (
                    <span>{proposals} időpont vár válaszra</span>
                  ) : state === "played" ? (
                    <span>Lejátszva, időpont egyeztetés nélkül</span>
                  ) : state === "bye" ? (
                    <span>Nincs teendő</span>
                  ) : (
                    <span>Még senki nem javasolt időpontot</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
