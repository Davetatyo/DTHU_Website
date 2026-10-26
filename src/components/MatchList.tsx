import Link from "next/link";
import { sameName } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import type { MatchView } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function MatchList({
  matches,
  timeZone,
  highlight,
}: {
  matches: MatchView[];
  timeZone: string;
  highlight?: string | null;
}) {
  if (matches.length === 0) return <p className="muted">Nincs meccs.</p>;
  return (
    <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
      {matches.map((m) => {
        const mine = sameName(m.a.karnyx_name, highlight) || sameName(m.b?.karnyx_name, highlight);
        return (
          <li key={m.id} style={{ borderColor: "var(--border)" }}>
            <Link
              href={`/meccs/${m.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-2.5 hover:opacity-80"
              style={mine ? { background: "var(--surface-2)", borderRadius: "0.5rem" } : undefined}
            >
              <span className="muted w-6 text-right text-sm">{m.table_no}.</span>
              <span className="min-w-0 flex-1 font-medium">
                {m.a.karnyx_name} <span className="muted">vs</span> {m.b?.karnyx_name ?? "—"}
              </span>
              {m.scheduled_at && m.status !== "played" && (
                <span className="text-sm">{formatDateTime(m.scheduled_at, timeZone)}</span>
              )}
              <StatusBadge status={m.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
