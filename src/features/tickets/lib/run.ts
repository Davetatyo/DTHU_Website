// Holds the draws whose closing time has passed. Called by the hourly cron
// (src/app/api/cron/reminders) and by the admin "Sorsolás most" button.
// Server only: uses the service-role client and the Discord webhook.

import { randomInt } from "node:crypto";
import { postToDiscord } from "@/features/match-organizer/lib/discord";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { getDrawEntries, getProfilesById, profileName } from "./data";
import { drawWinners, totalTickets } from "./draw";
import type { Draw } from "./types";

export type DrawOutcome = { drawId: string; title: string; winners: string[]; completed: boolean };

/** Draws one closed draw. Safe to call twice: the database accepts only the first result. */
export async function holdDraw(draw: Draw, siteUrl: string | null): Promise<DrawOutcome> {
  const db = createAdminClient();
  const entries = (await getDrawEntries([draw.id])).map((e) => ({ profileId: e.profile_id, tickets: e.tickets }));
  const winners = drawWinners(entries, draw.winner_count, randomInt);
  const { data, error } = await db.rpc("ticket_draw_complete", {
    p_draw: draw.id,
    p_winners: winners,
    p_total_tickets: totalTickets(entries),
  });
  if (error) throw new Error(error.message);
  const completed = data === true;
  if (completed) await announce(draw, winners, entries.length, totalTickets(entries), siteUrl);
  return { drawId: draw.id, title: draw.title, winners, completed };
}

/** Every open draw past its closing time. */
export async function runDueDraws(siteUrl: string | null): Promise<DrawOutcome[]> {
  const { data, error } = await createAdminClient()
    .from("ticket_draws")
    .select("*")
    .eq("status", "open")
    .lte("closes_at", new Date().toISOString());
  if (error) throw new Error(error.message);
  const outcomes: DrawOutcome[] = [];
  for (const draw of (data ?? []) as Draw[]) {
    try {
      outcomes.push(await holdDraw(draw, siteUrl));
    } catch (err) {
      // e.g. "entries_changed" from a last-second entry: the next run retries.
      console.error("Sorsolás hiba", draw.id, err);
    }
  }
  return outcomes;
}

function tag(p: Profile | undefined): string {
  return p?.discord_id ? `<@${p.discord_id}>` : `**${profileName(p)}**`;
}

async function announce(draw: Draw, winners: string[], entrants: number, tickets: number, siteUrl: string | null) {
  const profiles = await getProfilesById(winners);
  const lines =
    winners.length === 0
      ? [`🎟️ **Sorsolás: ${draw.title}** lezárult, de senki sem nevezett.`]
      : [
          `🎟️ **Sorsolás: ${draw.title}** (${draw.prize}) · ${entrants} játékos, ${tickets} jegy`,
          ...winners.map((id, i) => `${winners.length > 1 ? `${i + 1}. ` : "🏆 Nyertes: "}${tag(profiles.get(id))}`),
        ];
  if (siteUrl) lines.push(`Részletek: ${siteUrl}${routes.tickets}`);
  await postToDiscord(lines);
}
