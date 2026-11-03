import { formatDateTime } from "@/features/match-organizer/lib/time";
import type { LedgerRow } from "../lib/types";

/** Ticket history rows. `names` (profile id → name) adds a player column (admin view). */
export function LedgerList({
  rows,
  timeZone,
  names,
}: {
  rows: LedgerRow[];
  timeZone?: string;
  names?: Map<string, string>;
}) {
  if (rows.length === 0) return <p className="muted text-sm">Még nincs jegymozgás.</p>;
  return (
    <ul className="panel3 ledger">
      {rows.map((r) => (
        <li key={r.id}>
          <span className={`amt ${r.amount > 0 ? "plus" : "minus"}`}>
            {r.amount > 0 ? "+" : ""}
            {r.amount}
          </span>
          <span className="min-w-0 flex-1">
            {names && <b className="mr-1">{names.get(r.profile_id) ?? "?"}</b>}
            <span className="break-words">{r.reason}</span>
          </span>
          <span className="muted shrink-0 text-xs">{formatDateTime(r.created_at, timeZone)}</span>
        </li>
      ))}
    </ul>
  );
}
