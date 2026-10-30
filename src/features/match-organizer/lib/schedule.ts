// Groups a round's matches for the match-row view: agreed times by day first, then the ones
// still being scheduled, then the played ones and the Byes.

import { dayKey, formatDay } from "./time";

type Groupable = { status: string; scheduled_at: string | null };

export type MatchGroup<M> = { key: string; title: string; sub?: string; matches: M[] };

/** "Ma", "Holnap", "Tegnap", otherwise the weekday; sub is the long date. */
export function dayTitle(value: string, timeZone: string, now: Date = new Date()): { title: string; sub: string } {
  const long = formatDay(value, timeZone); // "október 30., péntek"
  const [date, weekday] = long.split(", ");
  const diff = Math.round((Date.parse(dayKey(value, timeZone)) - Date.parse(dayKey(now, timeZone))) / 86_400_000);
  const near = diff === 0 ? "Ma" : diff === 1 ? "Holnap" : diff === -1 ? "Tegnap" : null;
  return near ? { title: near, sub: `${date} · ${weekday}` } : { title: weekday ?? long, sub: date };
}

export function groupMatches<M extends Groupable>(matches: M[], timeZone: string, now: Date = new Date()): MatchGroup<M>[] {
  const confirmed = matches
    .filter((m) => m.status === "confirmed" && m.scheduled_at)
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));
  const groups: MatchGroup<M>[] = [];
  for (const m of confirmed) {
    const key = dayKey(m.scheduled_at!, timeZone);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, ...dayTitle(m.scheduled_at!, timeZone, now), matches: [] };
      groups.push(g);
    }
    g.matches.push(m);
  }
  const rest: [string, string, (m: M) => boolean][] = [
    ["open", "Egyeztetés alatt", (m) => m.status === "pending" || m.status === "proposed"],
    ["played", "Lejátszott", (m) => m.status === "played"],
    ["bye", "Pihenő", (m) => m.status === "bye"],
  ];
  for (const [key, title, test] of rest) {
    const list = matches.filter(test);
    if (list.length) groups.push({ key, title, sub: `${list.length} meccs`, matches: list });
  }
  return groups;
}
