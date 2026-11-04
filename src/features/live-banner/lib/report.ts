import { createAdminClient } from "@/lib/supabase/server";
import { getActiveTournament, getProfilesByKarnyx, getScheduledMatches, profileFor } from "@/features/match-organizer/lib/data";
import type { VoiceReport, VoiceReportReply } from "../bot/live-voice-reporter";
import { decideLiveWrites, presenceFrom, type LiveCandidate, type MatchLive } from "./rules";

// How far back a match can still be live: far more than any game lasts, and it keeps the list short.
const LOOK_BACK_MS = 24 * 3600_000;

/** Applies one report from the Discord bot. Throws when the database can't be read. */
export async function applyVoiceReport(report: VoiceReport, now: Date = new Date()): Promise<VoiceReportReply> {
  const db = createAdminClient();
  const { data: channels, error } = await db.from("live_channels").select("discord_channel_id");
  if (error) throw new Error(error.message);
  const watch = (channels ?? []).map((c) => c.discord_channel_id as string);
  if (watch.length > 0) await db.from("live_channels").update({ last_report_at: now.toISOString() }).in("discord_channel_id", watch);

  const present = presenceFrom(report, watch);
  if (present.size === 0) return { watch };

  const tournament = await getActiveTournament();
  if (!tournament) return { watch };
  const matches = (await getScheduledMatches(tournament.id, new Date(now.getTime() - LOOK_BACK_MS))).filter((m) => m.status === "confirmed");
  if (matches.length === 0) return { watch };

  const profiles = await getProfilesByKarnyx(matches.flatMap((m) => [m.a.karnyx_name, ...(m.b ? [m.b.karnyx_name] : [])]));
  const candidates: LiveCandidate[] = matches.map((m) => ({
    id: m.id,
    status: m.status,
    scheduled_at: m.scheduled_at,
    // A player who never logged in has no Discord ID here, so only the other one can be detected.
    discordIds: [m.a, m.b].flatMap((player) => profileFor(profiles, player)?.discord_id ?? []),
  }));

  const { data: rowData } = await db
    .from("match_live")
    .select("*")
    .in("match_id", candidates.map((c) => c.id));
  const rows = new Map(((rowData ?? []) as MatchLive[]).map((row) => [row.match_id, row]));

  const stamp = now.toISOString();
  for (const write of decideLiveWrites(candidates, rows, present, now)) {
    if (write.kind === "start") {
      await db.from("match_live").upsert({
        match_id: write.match_id,
        channel_id: write.channel_id,
        started_at: stamp,
        last_seen_at: stamp,
        ended_at: null,
        source: "voice",
      });
    } else {
      await db.from("match_live").update({ channel_id: write.channel_id, last_seen_at: stamp }).eq("match_id", write.match_id);
    }
  }
  return { watch };
}
