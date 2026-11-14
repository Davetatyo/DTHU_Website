// Hourly cron work for standalone games (called from /api/cron/reminders): expire pending games
// after 7 days (game_expire, migration 0014), then ping the player who has to answer on day 3
// and 24 hours before expiry, in the Időpontfoglaló's Discord channel. Server only.

import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { postToDiscord } from "@/features/match-organizer/lib/discord";
import { reminderLine } from "./messages";
import { awaitingProfile } from "./rights";
import { FIRST_REMINDER_HOURS, reminderDue, timeLeftToAnswer } from "./timing";
import type { Game } from "./types";

type PendingRow = Pick<Game, "id" | "status" | "reported_at" | "reminders_sent" | "reported_side" | "profile_a" | "profile_b" | "context">;

export async function runGameReminders(siteUrl: string, now = new Date()): Promise<{ expired: number; reminded: number }> {
  const db = createAdminClient();
  const { data: expired, error: expireError } = await db.rpc("game_expire", { p_now: now.toISOString() });
  if (expireError) return { expired: 0, reminded: 0 }; // migration 0014 not run yet

  const cutoff = new Date(now.getTime() - FIRST_REMINDER_HOURS * 3_600_000).toISOString();
  const { data } = await db
    .from("games")
    .select("id, status, reported_at, reminders_sent, reported_side, profile_a, profile_b, context")
    .eq("status", "pending")
    .lt("reminders_sent", 2)
    .lte("reported_at", cutoff);

  const due: { game: PendingRow; level: 1 | 2; to: string }[] = [];
  for (const game of (data ?? []) as PendingRow[]) {
    const level = reminderDue(game, now);
    const to = awaitingProfile(game);
    if (!level || !to) continue;
    // Claim the ping first, so overlapping runs never send it twice (and a correction in
    // between, which resets reported_at, cancels it).
    const { data: claimed } = await db
      .from("games")
      .update({ reminders_sent: level })
      .eq("id", game.id)
      .eq("status", "pending")
      .eq("reported_at", game.reported_at)
      .lt("reminders_sent", level)
      .select("id");
    if (claimed?.length) due.push({ game, level, to });
  }
  if (due.length === 0) return { expired: Number(expired ?? 0), reminded: 0 };

  const { data: profiles } = await db
    .from("profiles")
    .select("id, karnyx_name, display_name, discord_id")
    .in("id", [...new Set(due.map((d) => d.to))]);
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const lines = due.map(({ game, level, to }) => {
    const p = byId.get(to);
    return reminderLine(
      { name: p?.karnyx_name ?? p?.display_name ?? "?", discordId: p?.discord_id ?? null },
      timeLeftToAnswer(game.reported_at, now),
      `${siteUrl}${routes.gameView(game.id)}`,
      level === 2,
    );
  });
  await postToDiscord(lines);
  return { expired: Number(expired ?? 0), reminded: lines.length };
}
