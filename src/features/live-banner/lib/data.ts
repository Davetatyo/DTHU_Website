import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getMatch } from "@/features/match-organizer/lib/data";
import { routes } from "@/lib/routes";
import { isLive, LIVE_BANNER_ADMINS_ONLY, MIN_LIVE_MIN, type MatchLive } from "./rules";

export type LiveChannel = {
  discord_channel_id: string;
  name: string;
  join_url: string | null;
  sort_order: number;
  last_report_at: string | null;
};

/** One card on the banner. Safe to send to the browser. */
export type LiveCard = {
  matchId: string;
  tableNo: number;
  playerA: string;
  playerB: string | null;
  channelName: string | null;
  /** The Discord link, or the match page when the channel has no link. */
  href: string;
  external: boolean;
};

/** The tournament channels. Empty until migration 0011 has run. */
export async function getLiveChannels(): Promise<LiveChannel[]> {
  const { data } = await createAdminClient().from("live_channels").select("*").order("sort_order").order("name");
  return (data ?? []) as LiveChannel[];
}

/** False until migration 0011 has run, so the admin page can say so. */
export async function liveTablesExist(): Promise<boolean> {
  const { error } = await createAdminClient().from("live_channels").select("discord_channel_id").limit(1);
  return !error;
}

/** The matches live right now, for the banner and the admin page. */
export async function getLiveCards(now: Date = new Date()): Promise<LiveCard[]> {
  const db = createAdminClient();
  // A live row was seen in the last 1.5 hours: see liveEndsAt. Older rows can't be live.
  const { data } = await db
    .from("match_live")
    .select("*")
    .is("ended_at", null)
    .gte("last_seen_at", new Date(now.getTime() - MIN_LIVE_MIN * 60_000).toISOString());
  const rows = ((data ?? []) as MatchLive[]).filter((row) => isLive(row, now));
  if (rows.length === 0) return [];

  const channels = new Map((await getLiveChannels()).map((c) => [c.discord_channel_id, c]));
  const cards: LiveCard[] = [];
  for (const row of rows) {
    const match = await getMatch(row.match_id);
    if (match?.status !== "confirmed") continue; // marked played or reset: the banner ends
    const channel = row.channel_id ? channels.get(row.channel_id) : undefined;
    cards.push({
      matchId: match.id,
      tableNo: match.table_no,
      playerA: match.a.karnyx_name,
      playerB: match.b?.karnyx_name ?? null,
      channelName: channel?.name ?? null,
      href: channel?.join_url ?? routes.match(match.id),
      external: !!channel?.join_url,
    });
  }
  return cards.sort((a, b) => a.tableNo - b.tableNo);
}

/** Whether this visitor gets the banner: logged-in users only, admins only during the test phase. */
export async function canSeeLiveBanner(): Promise<boolean> {
  if (LIVE_BANNER_ADMINS_ONLY) return getAdminView();
  return !!(await getCurrentProfile());
}
