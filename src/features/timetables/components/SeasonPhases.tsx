import Link from "next/link";
import { PHASES } from "../data/events";

const md = (s: string) => s.slice(5).replace("-", ".") + ".";

/** The season plan as a timeline (shown under the header on every full-site page). */
export function SeasonPhases() {
  const now = Date.now();
  return (
    <nav className="phases" aria-label="Szezon fázisai">
      {PHASES.map((p) => {
        const a = new Date(`${p.a}T00:00:00`).getTime();
        const b = new Date(`${p.b}T23:59:59`).getTime();
        const st = now > b ? "done" : now >= a ? "now" : "";
        const pct = st === "now" ? Math.round(((now - a) / (b - a)) * 100) : 0;
        return (
          <Link key={p.t} href={p.h} className={`ph-i ${st}`}>
            <b>{p.t}</b>
            <small>{p.a === p.b ? md(p.a) : `${md(p.a)} – ${md(p.b)}`}</small>
            <span className="bar2">
              <i style={{ width: `${pct}%` }} />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
