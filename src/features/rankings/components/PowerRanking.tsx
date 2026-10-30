import Link from "next/link";
import { HeroAvatar } from "@/components/HeroAvatar";
import { routes } from "@/lib/routes";
import { movement, type RankRow } from "../lib/ranking";
import "../rankings.css";

/** Compact top-N list for side panels (home page). */
export function PowerRanking({ rows, limit, me }: { rows: RankRow[]; limit: number; me?: string | null }) {
  if (rows.length === 0) return <p className="muted p-3 text-sm">Még nincs játékos.</p>;
  return (
    <>
      {rows.slice(0, limit).map((r, i) => {
        const [cls, label] = movement(r.p);
        return (
          <Link key={r.p} href={routes.rankings} className={`pr-row${r.p === me ? " me" : ""}`}>
            <span className="n">{i + 1}</span>
            <span className={`mv ${cls}`}>{label}</span>
            <HeroAvatar name={r.p} hero={r.hero} />
            <span className="min-w-0">
              <b>{r.p}</b>
              <small>{r.hero}</small>
            </span>
            <span className="p">{r.pts}</span>
          </Link>
        );
      })}
    </>
  );
}
