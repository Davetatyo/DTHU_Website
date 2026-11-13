// Bajnokságok (built-in tournaments) on the Eseménynaptár. Like the Karnyx league's rounds they
// come straight from the tournament tables, so admins never type them in twice.

import { routes } from "@/lib/routes";
import { dayKey } from "@/features/match-organizer/lib/time";
import { FORMAT_LABELS } from "@/features/championships/lib/rules";
import type { Championship, Round } from "@/features/championships/lib/types";
import { formatEventDate, type CalendarItem } from "./events";

type TournamentInfo = Pick<Championship, "id" | "name" | "slug" | "status" | "starts_at" | "format">;
type RoundSpan = Pick<Round, "starts_at" | "deadline" | "closed_at">;

/**
 * One card per tournament, from its start to its last round's end. Null when there is no date
 * yet (no start time set and not started), or for drafts players can't see.
 */
export function tournamentCalendarItem(
  t: TournamentInfo,
  rounds: RoundSpan[],
  registrations: number,
  timeZone: string,
  now: Date,
): CalendarItem | null {
  if (t.status === "draft") return null;
  const firstRound = rounds.map((r) => r.starts_at).sort()[0];
  const startIso = t.starts_at ?? firstRound;
  if (!startIso) return null;

  const lastEnd = rounds.map((r) => r.closed_at ?? r.deadline).sort().at(-1);
  const endIso = lastEnd && lastEnd > startIso ? lastEnd : null;
  const start = new Date(startIso);
  const end = new Date(endIso ?? startIso);

  const format = FORMAT_LABELS[t.format];
  const summary =
    t.status === "registration"
      ? `${format} verseny, jelentkezés nyitva (${registrations} jelentkező). Válassz 3 hőst a Bajnokságok oldalon.`
      : t.status === "running"
        ? `${format} verseny, folyamatban.`
        : `${format} verseny, véget ért.`;

  return {
    key: `tournament:${t.id}`,
    title: t.name,
    kind: "online",
    tentative: false,
    startDay: dayKey(startIso, timeZone),
    endDay: dayKey(endIso ?? startIso, timeZone),
    dateLabel: formatEventDate(startIso, endIso, false, timeZone),
    location: "Online · Discord",
    summary,
    cover: null,
    href: routes.championship(t.slug),
    external: false,
    pinned: false,
    ongoing: t.status === "running",
    past: t.status === "finished" && end < now,
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}
