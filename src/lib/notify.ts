// Discord messages for the tournament channel (Hungarian text).

import { getProfilesByKarnyx, getRoundMatches } from "./data";
import { mention, postToDiscord } from "./discord";
import { formatDateTime } from "./time";
import type { MatchView, Round } from "./types";

function names(matches: MatchView[]): string[] {
  return matches.flatMap((m) => [m.a.karnyx_name, ...(m.b ? [m.b.karnyx_name] : [])]);
}

export async function notifyRoundOpened(round: Round, siteUrl: string) {
  const matches = await getRoundMatches(round.id);
  const profiles = await getProfilesByKarnyx(names(matches));
  await postToDiscord([
    `🎲 **Elindult a ${round.number}. forduló!** Határidő: ${formatDateTime(round.deadline)}`,
    `Egyeztessetek időpontot itt: ${siteUrl}`,
    "",
    ...matches.map((m) =>
      m.b ? `${m.table_no}. ${mention(m.a, profiles)} vs ${mention(m.b, profiles)}` : `${m.table_no}. ${mention(m.a, profiles)}: erőnyerő`,
    ),
  ]);
}

export async function notifyProposal(match: MatchView, proposerName: string, slots: Date[], siteUrl: string) {
  const opponent = match.a.karnyx_name.toLowerCase() === proposerName.toLowerCase() ? match.b : match.a;
  const profiles = await getProfilesByKarnyx(names([match]));
  await postToDiscord([
    `📅 ${mention(opponent, profiles)}, **${proposerName}** időpontot javasolt a ${match.round.number}. fordulós meccsetekre:`,
    ...slots.map((s) => `• ${formatDateTime(s)}`),
    `Válassz itt: ${siteUrl}/meccs/${match.id}`,
  ]);
}

export async function notifyConfirmed(match: MatchView, scheduledAt: Date, siteUrl: string) {
  const profiles = await getProfilesByKarnyx(names([match]));
  await postToDiscord([
    `✅ **Megerősítve:** ${mention(match.a, profiles)} vs ${mention(match.b, profiles)}, ${formatDateTime(scheduledAt)} (${match.round.number}. forduló)`,
    `${siteUrl}/meccs/${match.id}`,
  ]);
}

export async function notifyRoundComplete(round: Round) {
  await postToDiscord([`🏁 A ${round.number}. forduló minden meccse lejátszva, jöhet a következő forduló!`]);
}
