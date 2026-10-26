import Link from "next/link";
import { formatDateTime } from "@/lib/time";
import type { MatchView, Player } from "@/lib/types";

// Admin overview: one card per match, coloured by how far the pair got with scheduling.

type CardState = "pending" | "proposed" | "confirmed" | "overdue" | "played" | "bye";

const STATE: Record<CardState, { label: string; color: string; bg: string }> = {
  pending: { label: "Nincs időpont", color: "var(--danger)", bg: "var(--danger-bg)" },
  proposed: { label: "Időpont javasolva", color: "var(--warn)", bg: "var(--warn-bg)" },
  confirmed: { label: "Megerősítve", color: "var(--ok)", bg: "var(--ok-bg)" },
  overdue: { label: "Elmúlt, lejátszásra vár", color: "var(--accent)", bg: "var(--surface-2)" },
  played: { label: "Lejátszva", color: "var(--muted)", bg: "var(--surface-2)" },
  bye: { label: "Bye", color: "var(--muted)", bg: "var(--surface-2)" },
};

function cardState(match: MatchView, now: Date): CardState {
  if (match.status === "confirmed" && match.scheduled_at && new Date(match.scheduled_at) < now) return "overdue";
  return match.status;
}

function PlayerLine({ player, registered }: { player: Player | null; registered: (p: Player) => boolean }) {
  if (!player) return <div className="muted italic">nincs ellenfél</div>;
  const ok = registered(player);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: ok ? "var(--ok)" : "var(--border)" }}
          title={ok ? "Regisztrált" : "Még nem regisztrált"}
        />
        <span className="truncate font-semibold">{player.karnyx_name}</span>
      </div>
      {player.heroes.length > 0 && <div className="muted truncate pl-3.5 text-xs">{player.heroes.join(" · ")}</div>}
    </div>
  );
}

export function MatchupGrid({
  matches,
  timeZone,
  registeredNames,
  openProposalCounts,
}: {
  matches: MatchView[];
  timeZone: string;
  registeredNames: Set<string>;
  openProposalCounts: Map<string, number>;
}) {
  const now = new Date();
  const registered = (p: Player) => registeredNames.has(p.karnyx_name.toLowerCase());

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
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--ok)" }} /> regisztrált játékos
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => {
          const state = cardState(m, now);
          const style = STATE[state];
          const proposals = openProposalCounts.get(m.id) ?? 0;
          const faded = state === "played" || state === "bye";
          return (
            <Link
              key={m.id}
              href={`/meccs/${m.id}`}
              className="flex flex-col overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5"
              style={{ borderColor: "var(--border)", background: "var(--surface)", opacity: faded ? 0.7 : 1 }}
            >
              <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
                <span>{m.table_no}. asztal</span>
                <span>{style.label}</span>
              </div>
              <div className="flex-1 space-y-1.5 px-3 py-2.5" style={{ borderLeft: `4px solid ${style.color}` }}>
                <PlayerLine player={m.a} registered={registered} />
                <div className="muted pl-3.5 text-xs">vs</div>
                <PlayerLine player={m.b} registered={registered} />
              </div>
              <div className="border-t px-3 py-1.5 text-sm" style={{ borderColor: "var(--border)", borderLeft: `4px solid ${style.color}` }}>
                {m.scheduled_at && (state === "confirmed" || state === "overdue" || state === "played") ? (
                  <span className="font-medium first-letter:uppercase">{formatDateTime(m.scheduled_at, timeZone)}</span>
                ) : state === "proposed" ? (
                  <span className="muted">{proposals} időpont vár válaszra</span>
                ) : state === "played" ? (
                  <span className="muted">Lejátszva, időpont egyeztetés nélkül</span>
                ) : state === "bye" ? (
                  <span className="muted">Nincs teendő</span>
                ) : (
                  <span className="muted">Még senki nem javasolt időpontot</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
