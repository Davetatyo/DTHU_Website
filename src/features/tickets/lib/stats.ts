// Builds what the draw cards need: per-draw stats and winner names.

import { getDrawEntries, getDrawWinners, getProfilesById, profileName } from "./data";
import type { Draw, DrawStats } from "./types";

export async function loadDrawStats(draws: Draw[], viewerId: string | null): Promise<Map<string, DrawStats>> {
  const ids = draws.map((d) => d.id);
  const [entries, winners] = await Promise.all([getDrawEntries(ids), getDrawWinners(ids)]);
  const profiles = await getProfilesById(winners.map((w) => w.profile_id));
  const stats = new Map<string, DrawStats>();
  for (const d of draws) {
    const drawEntries = entries.filter((e) => e.draw_id === d.id);
    const won = winners.filter((w) => w.draw_id === d.id);
    stats.set(d.id, {
      entrants: drawEntries.length,
      tickets: drawEntries.reduce((n, e) => n + e.tickets, 0),
      mine: drawEntries.find((e) => e.profile_id === viewerId)?.tickets ?? 0,
      winners: won.map((w) => profileName(profiles.get(w.profile_id))),
      iWon: !!viewerId && won.some((w) => w.profile_id === viewerId),
    });
  }
  return stats;
}
