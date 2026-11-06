import { routes } from "@/lib/routes";
import { getProfilesByKarnyx, getRoundMatches } from "@/features/match-organizer/lib/data";
import { mention, postToDiscord } from "@/features/match-organizer/lib/discord";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import type { MatchView, Profile } from "@/features/match-organizer/lib/types";
import type { Championship, Round } from "./types";

/** Discord post for a new championship round: pairings, and where to pick a time. */
function championshipRoundLines(
  t: Pick<Championship, "name" | "slug">,
  round: Pick<Round, "number" | "deadline">,
  matches: MatchView[],
  profiles: Map<string, Profile>,
  siteUrl: string,
): string[] {
  const pairs = matches.filter((m) => m.b);
  const resting = matches.filter((m) => !m.b);
  const lines = [
    `🏆 **${t.name}: elindult a ${round.number}. forduló!** Határidő: ${formatDateTime(round.deadline)}`,
    `Párosítás és időpont egyeztetés: ${siteUrl}${routes.championship(t.slug)}`,
    "",
    ...pairs.map((m, i) => `${i + 1}. ${mention(m.a, profiles)} vs ${mention(m.b, profiles)}`),
  ];
  if (resting.length) lines.push("", `Pihen: ${resting.map((m) => mention(m.a, profiles)).join(", ")}`);
  return lines;
}

export async function notifyChampionshipRound(t: Pick<Championship, "name" | "slug">, round: Round, siteUrl: string) {
  const matches = await getRoundMatches(round.id);
  const profiles = await getProfilesByKarnyx(matches.flatMap((m) => [m.a.karnyx_name, m.b?.karnyx_name ?? ""]).filter(Boolean));
  await postToDiscord(championshipRoundLines(t, round, matches, profiles, siteUrl));
}
