import { NextResponse, type NextRequest } from "next/server";
import { getProfilesByKarnyx, getRoundMatches } from "@/lib/data";
import { mention, postToDiscord } from "@/lib/discord";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import type { Round } from "@/lib/types";

// Called hourly by Supabase pg_cron (see README). Sends one warning per round 48 hours before
// the deadline, pinging the players whose match still has no agreed time.

const DEADLINE_WARNING_MS = 48 * 3600_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = createAdminClient();
  const site = await getSiteUrl();
  let warnings = 0;

  const { data: openRounds } = await db
    .from("rounds")
    .select("*")
    .is("closed_at", null)
    .is("completed_at", null)
    .eq("deadline_warning_sent", false)
    .lte("deadline", new Date(Date.now() + DEADLINE_WARNING_MS).toISOString());

  for (const round of (openRounds ?? []) as Round[]) {
    // Claim the warning first so overlapping runs never send it twice.
    const { data: claimed } = await db
      .from("rounds")
      .update({ deadline_warning_sent: true })
      .eq("id", round.id)
      .eq("deadline_warning_sent", false)
      .select("id");
    if (!claimed?.length) continue;

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

  return NextResponse.json({ warnings });
}
