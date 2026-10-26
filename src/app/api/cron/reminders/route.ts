import { NextResponse, type NextRequest } from "next/server";
import { getProfilesByKarnyx, getRoundMatches } from "@/lib/data";
import { mention, postToDiscord } from "@/lib/discord";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/time";
import type { MatchView, Round } from "@/lib/types";

// Called every 10 minutes by Supabase pg_cron (see README). Sends:
//  - a reminder about 1 hour before each confirmed match
//  - one warning per round 48 hours before the deadline, listing matches without an agreed time

const REMINDER_WINDOW_MS = 65 * 60_000;
const DEADLINE_WARNING_MS = 48 * 3600_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = createAdminClient();
  const site = await getSiteUrl();
  const now = Date.now();
  let reminders = 0;
  let warnings = 0;

  const { data: dueMatches } = await db
    .from("matches")
    .select("*, a:players!matches_player_a_fkey(*), b:players!matches_player_b_fkey(*), round:rounds!inner(*)")
    .eq("status", "confirmed")
    .eq("reminder_sent", false)
    .gte("scheduled_at", new Date(now).toISOString())
    .lte("scheduled_at", new Date(now + REMINDER_WINDOW_MS).toISOString());

  for (const match of (dueMatches ?? []) as MatchView[]) {
    // Claim the reminder first so overlapping runs never send it twice.
    const { data: claimed } = await db
      .from("matches")
      .update({ reminder_sent: true })
      .eq("id", match.id)
      .eq("reminder_sent", false)
      .select("id");
    if (!claimed?.length) continue;
    const profiles = await getProfilesByKarnyx([match.a.karnyx_name, match.b?.karnyx_name ?? ""]);
    await postToDiscord([
      `⏰ **Hamarosan, ${formatTime(match.scheduled_at!)}:** ${mention(match.a, profiles)} vs ${mention(match.b, profiles)} (${match.round.number}. forduló). Jó játékot!`,
    ]);
    reminders++;
  }

  const { data: openRounds } = await db
    .from("rounds")
    .select("*")
    .is("closed_at", null)
    .is("completed_at", null)
    .eq("deadline_warning_sent", false)
    .lte("deadline", new Date(now + DEADLINE_WARNING_MS).toISOString());

  for (const round of (openRounds ?? []) as Round[]) {
    await db.from("rounds").update({ deadline_warning_sent: true }).eq("id", round.id);
    const unscheduled = (await getRoundMatches(round.id)).filter((m) => m.status === "pending" || m.status === "proposed");
    if (unscheduled.length === 0) continue;
    const profiles = await getProfilesByKarnyx(unscheduled.flatMap((m) => [m.a.karnyx_name, m.b?.karnyx_name ?? ""]));
    await postToDiscord([
      `⚠️ **A ${round.number}. forduló határideje: ${formatDateTime(round.deadline)}.** Ezeknek a meccseknek még nincs időpontja:`,
      ...unscheduled.map((m) => `• ${mention(m.a, profiles)} vs ${mention(m.b, profiles)}`),
      `Egyeztessetek itt: ${site}`,
    ]);
    warnings++;
  }

  return NextResponse.json({ reminders, warnings });
}
