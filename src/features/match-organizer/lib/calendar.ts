import { routes } from "@/lib/routes";
import type { CalendarEvent } from "./ics";
import type { MatchView } from "./types";

export function matchTitle(match: MatchView): string {
  return `Dice Throne ${match.round.number}. forduló: ${match.a.karnyx_name} vs ${match.b?.karnyx_name ?? "?"}`;
}

export function matchEvent(match: MatchView, siteUrl: string): CalendarEvent {
  const heroes = (names: string[] | undefined) => (names?.length ? ` (${names.join(", ")})` : "");
  return {
    uid: `${match.id}@dt-match-organizer`,
    start: new Date(match.scheduled_at!),
    title: matchTitle(match),
    description: `${match.a.karnyx_name}${heroes(match.a.heroes)} vs ${match.b?.karnyx_name}${heroes(match.b?.heroes)}. Discordon játszotok.`,
    url: `${siteUrl}${routes.match(match.id)}`,
  };
}
