import { formatDateTime } from "@/features/match-organizer/lib/time";
import type { LedgerRow } from "../lib/types";

/** The fields a history row needs: ticket ledger rows, and the Bolt's DTHU coin ledger rows. */
type Row = Pick<LedgerRow, "id" | "profile_id" | "amount" | "reason" | "created_at">;

/**
 * Ticket (or coin) history rows, for admins. `names` (profile id → name) adds a player column;
 * `format` formats the amount (e.g. coin thousands), `empty` is the text when there are no rows.
 */
export function LedgerList({
  rows,
  timeZone,
  names,
  format = String,
  empty = "Még nincs jegymozgás.",
}: {
  rows: Row[];
  timeZone?: string;
  names?: Map<string, string>;
  format?: (n: number) => string;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="muted text-sm">{empty}</p>;
  return (
    <ul className="panel3 ledger">
      {rows.map((r) => (
        <li key={r.id}>
          <span className={`amt ${r.amount > 0 ? "plus" : "minus"}`}>
            {r.amount > 0 ? "+" : ""}
            {format(r.amount)}
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
