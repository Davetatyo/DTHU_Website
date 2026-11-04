// The rules of the live banner, agreed with the owner on 2026-11-04. Pure and browser-safe.
//
// - A confirmed match can go live from 30 minutes before its time to 30 minutes after.
// - One of its players being in a tournament voice channel is enough.
// - Once live it stays on for at least 1.5 hours, and longer while a player is still in a channel.
// - It ends early only when the match is marked played or an admin stops it.

import type { VoiceReport } from "../bot/live-voice-reporter";

export const START_WINDOW_MIN = 30;
export const MIN_LIVE_MIN = 90;
/** A player counts as still there this long after the bot last saw them (bot heartbeat is 1 min). */
export const PRESENCE_GRACE_MIN = 3;

/** Test phase: only admins see the banner. Set to false to show it to every logged-in user. */
export const LIVE_BANNER_ADMINS_ONLY = true;

const MINUTE = 60_000;

export type MatchLive = {
  match_id: string;
  channel_id: string | null;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  source: "voice" | "admin";
};

/** A match the bot's report may affect, with the Discord IDs of its players we know. */
export type LiveCandidate = {
  id: string;
  status: string;
  scheduled_at: string | null;
  discordIds: string[];
};

export type LiveWrite = { kind: "start" | "seen"; match_id: string; channel_id: string };

/** When a match's banner goes off, unless it is marked played or stopped first. */
export function liveEndsAt(row: Pick<MatchLive, "started_at" | "last_seen_at">): Date {
  return new Date(
    Math.max(Date.parse(row.started_at) + MIN_LIVE_MIN * MINUTE, Date.parse(row.last_seen_at) + PRESENCE_GRACE_MIN * MINUTE),
  );
}

export function isLive(row: Pick<MatchLive, "started_at" | "last_seen_at" | "ended_at">, now: Date): boolean {
  return !row.ended_at && now < liveEndsAt(row);
}

function windowStart(scheduledAt: string): number {
  return Date.parse(scheduledAt) - START_WINDOW_MIN * MINUTE;
}

export function inStartWindow(scheduledAt: string, now: Date): boolean {
  const t = now.getTime();
  return t >= windowStart(scheduledAt) && t <= Date.parse(scheduledAt) + START_WINDOW_MIN * MINUTE;
}

/** Discord user ID → channel, for the users the report places in a tournament channel. */
export function presenceFrom(report: VoiceReport, watchedChannelIds: string[]): Map<string, string> {
  const watched = new Set(watchedChannelIds);
  const present = new Map<string, string>();
  for (const channel of report.channels) {
    if (!watched.has(channel.id)) continue;
    for (const userId of channel.userIds) present.set(userId, channel.id);
  }
  return present;
}

/** What a bot report changes: matches that go live, and live matches whose players were seen. */
export function decideLiveWrites(
  matches: LiveCandidate[],
  rows: Map<string, MatchLive>,
  present: Map<string, string>,
  now: Date,
): LiveWrite[] {
  const writes: LiveWrite[] = [];
  for (const match of matches) {
    if (match.status !== "confirmed" || !match.scheduled_at) continue;
    const channelId = match.discordIds.map((id) => present.get(id)).find(Boolean);
    if (!channelId) continue;

    const row = rows.get(match.id);
    if (row && isLive(row, now)) {
      writes.push({ kind: "seen", match_id: match.id, channel_id: channelId });
      continue;
    }
    if (!inStartWindow(match.scheduled_at, now)) continue;
    // Already had its live time for this schedule, or an admin stopped it. A row from before this
    // window belongs to an earlier time the match was moved away from, so it doesn't count.
    if (row && Date.parse(row.started_at) >= windowStart(match.scheduled_at)) continue;
    writes.push({ kind: "start", match_id: match.id, channel_id: channelId });
  }
  return writes;
}

/** A bot report from the request body, or null when it isn't one. */
export function parseVoiceReport(body: unknown): VoiceReport | null {
  if (typeof body !== "object" || body === null) return null;
  const channels = (body as { channels?: unknown }).channels;
  if (!Array.isArray(channels) || channels.length > 50) return null;
  const parsed: VoiceReport["channels"] = [];
  for (const channel of channels) {
    const { id, userIds } = (channel ?? {}) as { id?: unknown; userIds?: unknown };
    if (!isDiscordId(id) || !Array.isArray(userIds) || userIds.length > 500 || !userIds.every(isDiscordId)) return null;
    parsed.push({ id, userIds });
  }
  return { channels: parsed };
}

export function isDiscordId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]{15,25}$/.test(value);
}

/** Only real Discord links can go on the banner. */
export function isJoinUrl(value: string): boolean {
  return /^https:\/\/(discord\.com|discord\.gg)\/\S+$/.test(value);
}
