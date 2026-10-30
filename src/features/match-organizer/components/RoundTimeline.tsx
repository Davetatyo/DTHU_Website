import { formatShortDate } from "@/features/match-organizer/lib/time";
import type { Round } from "@/features/match-organizer/lib/types";

/** The tournament's rounds as a timeline; the running round shows how much of its week is gone. */
export function RoundTimeline({ rounds, timeZone }: { rounds: Round[]; timeZone: string }) {
  if (rounds.length === 0) return null;
  const now = Date.now();
  const ordered = [...rounds].sort((a, b) => a.number - b.number);

  return (
    <div className="phases" aria-label="A verseny fordulói">
      {ordered.map((r) => {
        const start = Date.parse(r.starts_at);
        const end = Date.parse(r.deadline);
        const done = !!r.closed_at || !!r.completed_at || now > end;
        const pct = done ? 100 : Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
        return (
          <div key={r.id} className={`ph-i${done ? " done" : " now"}`}>
            <b>{r.number}. forduló</b>
            <small>
              {formatShortDate(r.starts_at, timeZone)} – {formatShortDate(r.deadline, timeZone)}
              {r.completed_at ? " · kész" : ""}
            </small>
            <span className="bar2">
              <i style={{ width: `${pct}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
