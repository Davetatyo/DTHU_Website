import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { DEFAULT_TIMEZONE } from "@/features/match-organizer/lib/time";
import { getCalendarItems } from "../lib/events-data";

const md = (day: string) => day.slice(5).replace("-", ".") + ".";

/**
 * The season as a timeline under the header on every full-site page: the latest finished
 * entry and the next ones from the Eseménynaptár (events + online rounds), oldest first.
 */
export async function SeasonPhases() {
  const viewer = await getCurrentProfile();
  const items = await getCalendarItems(viewer?.timezone ?? DEFAULT_TIMEZONE);
  const byStart = [...items].sort((a, b) => a.startMs - b.startMs);
  const firstOpen = byStart.findIndex((i) => !i.past);
  const from = firstOpen === -1 ? Math.max(0, byStart.length - 1) : Math.max(0, firstOpen - 1);
  const shown = byStart.slice(from, from + 6);
  if (shown.length === 0) return null;
  const now = Date.now();

  return (
    <nav className="phases" aria-label="Szezon fázisai">
      {shown.map((p) => {
        const st = p.past ? "done" : p.ongoing ? "now" : "";
        const body = (
          <>
            <b>{p.title}</b>
            <small>{p.startDay === p.endDay ? md(p.startDay) : `${md(p.startDay)} – ${md(p.endDay)}`}</small>
            <span className="bar2">
              <i style={{ width: st === "now" ? `${Math.round(((now - p.startMs) / Math.max(1, p.endMs - p.startMs)) * 100)}%` : 0 }} />
            </span>
          </>
        );
        return p.href && p.external ? (
          <a key={p.key} href={p.href} target="_blank" rel="noopener noreferrer" className={`ph-i ${st}`}>
            {body}
          </a>
        ) : (
          <Link key={p.key} href={p.href ?? routes.timetables} className={`ph-i ${st}`}>
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
