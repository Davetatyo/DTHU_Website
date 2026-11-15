import Link from "next/link";
import { STAT_KINDS, type StatKind } from "../lib/stats";
import "../player-stats.css";

/** Összes / Bajnokság / Ranked / Casual links (?tipus=), with each kind's game count. */
export function StatKindNav({ basePath, kind, counts }: { basePath: string; kind: StatKind; counts: Record<StatKind, number> }) {
  return (
    <nav className="ps-filter" aria-label="Játszmák típusa">
      {STAT_KINDS.map((k) => (
        <Link key={k.kind} href={k.kind === "all" ? basePath : `${basePath}?tipus=${k.param}`} aria-current={k.kind === kind ? "page" : undefined} scroll={false}>
          {k.label}
          <small>{counts[k.kind]}</small>
        </Link>
      ))}
    </nav>
  );
}
