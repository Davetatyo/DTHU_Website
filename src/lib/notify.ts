// Discord messages for the tournament channel (Hungarian text).

import { getProfilesByKarnyx, getRoundMatches, profileFor } from "./data";
import { mention, postToDiscord } from "./discord";
import { createAdminClient } from "./supabase/server";
import { formatDateTime } from "./time";
import type { MatchView, Player, Profile, Round } from "./types";

function names(matches: MatchView[]): string[] {
  return matches.flatMap((m) => [m.a.karnyx_name, ...(m.b ? [m.b.karnyx_name] : [])]);
}

/** Round announcement: the pairs first, then one "Pihen:" line naming the Bye players. */
export function roundOpenedLines(round: Round, matches: MatchView[], profiles: Map<string, Profile>, siteUrl: string): string[] {
  const pairs = matches.filter((m) => m.b);
  const resting = matches.filter((m) => !m.b);
  const lines = [
    `🎲 **Elindult a ${round.number}. forduló!** Határidő: ${formatDateTime(round.deadline)}`,
    `Egyeztessetek időpontot itt: ${siteUrl}`,
    "",
    ...pairs.map((m, i) => `${i + 1}. ${mention(m.a, profiles)} vs ${mention(m.b, profiles)}`),
  ];
  if (resting.length) lines.push("", `Pihen: ${resting.map((m) => mention(m.a, profiles)).join(", ")}`);
  return lines;
}

export async function notifyRoundOpened(round: Round, siteUrl: string) {
  const matches = await getRoundMatches(round.id);
  const profiles = await getProfilesByKarnyx(names(matches));
  await postToDiscord(roundOpenedLines(round, matches, profiles, siteUrl));
}

/** One short line: ping whoever has to answer, plus the match link. */
export function proposalLine(match: MatchView, recipients: Player[], proposerName: string, profiles: Map<string, Profile>, siteUrl: string): string {
  return `📅 ${recipients.map((p) => mention(p, profiles)).join(", ")}, **${proposerName}** időpontot javasolt: ${siteUrl}/meccs/${match.id}`;
}

/**
 * Pings the players who have to answer a proposal. Only players who logged in (so we know
 * their Discord ID) can be pinged, so this reports exactly who was reached.
 */
export async function notifyProposal(
  match: MatchView,
  recipients: Player[],
  proposerName: string,
  siteUrl: string,
): Promise<{ notified: Player[]; unregistered: Player[]; failed: boolean }> {
  const profiles = await getProfilesByKarnyx(names([match]));
  const reachable = recipients.filter((p) => profileFor(profiles, p)?.discord_id);
  const unregistered = recipients.filter((p) => !reachable.includes(p));
  if (reachable.length === 0) return { notified: [], unregistered, failed: false };

  const sent = await postToDiscord([proposalLine(match, reachable, proposerName, profiles, siteUrl)]);
  return { notified: sent ? reachable : [], unregistered, failed: !sent };
}

/** Announces an agreed time for everyone to see; names are bold, nobody is pinged. */
export function confirmedLines(match: MatchView, scheduledAt: Date, siteUrl: string): string[] {
  return [
    `✅ **Megerősítve:** **${match.a.karnyx_name}** vs **${match.b?.karnyx_name}**, ${formatDateTime(scheduledAt)} (${match.round.number}. forduló)`,
    `${siteUrl}/meccs/${match.id}`,
  ];
}

export async function notifyConfirmed(match: MatchView, scheduledAt: Date, siteUrl: string) {
  await postToDiscord(confirmedLines(match, scheduledAt, siteUrl));
}

export type ReminderTargets = {
  /** Matches where nobody has suggested a time: both players are reminded. */
  unscheduled: MatchView[];
  /** Matches with an open suggestion: only the player who has to answer is reminded. */
  awaitingAnswer: { match: MatchView; responders: Player[]; proposer: string }[];
};

/** Who still owes an action in the round: no suggestion sent yet, or a suggestion to answer. */
export async function getReminderTargets(roundId: string): Promise<ReminderTargets> {
  const matches = await getRoundMatches(roundId);
  const unscheduled = matches.filter((m) => m.status === "pending");
  const proposed = matches.filter((m) => m.status === "proposed");
  if (proposed.length === 0) return { unscheduled, awaitingAnswer: [] };

  const { data } = await createAdminClient()
    .from("proposals")
    .select("match_id, proposed_by")
    .in("match_id", proposed.map((m) => m.id))
    .eq("status", "open");
  const proposerId = new Map((data ?? []).map((p) => [p.match_id as string, p.proposed_by as string | null]));
  const profiles = await getProfilesByKarnyx(names(proposed));

  const awaitingAnswer = proposed.map((match) => {
    const players = [match.a, match.b!];
    const byPlayer = players.find((p) => profileFor(profiles, p)?.id === proposerId.get(match.id));
    // If an admin suggested the times, both players have to answer.
    return {
      match,
      responders: byPlayer ? players.filter((p) => p !== byPlayer) : players,
      proposer: byPlayer?.karnyx_name ?? "az admin",
    };
  });
  return { unscheduled, awaitingAnswer };
}

export function reminderLines(round: Round, targets: ReminderTargets, profiles: Map<string, Profile>, siteUrl: string): string[] {
  const lines = [`⏰ **Emlékeztető: ${round.number}. forduló**, határidő: ${formatDateTime(round.deadline)}`];
  if (targets.unscheduled.length) {
    lines.push("", "**Még nincs időpont-javaslat, javasoljatok időpontot:**");
    lines.push(...targets.unscheduled.map((m) => `• ${mention(m.a, profiles)} vs ${mention(m.b, profiles)}`));
  }
  if (targets.awaitingAnswer.length) {
    lines.push("", "**Javaslat vár a válaszotokra, fogadjatok el egyet vagy javasoljatok újat:**");
    lines.push(
      ...targets.awaitingAnswer.map(
        (t) => `• ${t.responders.map((p) => mention(p, profiles)).join(", ")} (${t.proposer} javasolt)`,
      ),
    );
  }
  lines.push("", `Egyeztetés itt: ${siteUrl}`);
  return lines;
}

/** Posts the admin's manual reminder. Returns the players it pinged and those it could only name. */
export async function notifyReminder(round: Round, targets: ReminderTargets, siteUrl: string) {
  const everyone = [
    ...targets.unscheduled.flatMap((m) => [m.a, m.b!]),
    ...targets.awaitingAnswer.flatMap((t) => t.responders),
  ];
  const profiles = await getProfilesByKarnyx(everyone.map((p) => p.karnyx_name));
  const sent = await postToDiscord(reminderLines(round, targets, profiles, siteUrl));
  return {
    sent,
    pinged: everyone.filter((p) => profileFor(profiles, p)?.discord_id),
    unregistered: everyone.filter((p) => !profileFor(profiles, p)?.discord_id),
  };
}
