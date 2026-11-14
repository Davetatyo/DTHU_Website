// Discord texts for game reports: the ping when a game is reported or corrected (actions/games.ts)
// and the reminders for unanswered ones (hourly cron, lib/cron.ts). Pure.

/** "⏳ @Player, 4 nap maradt a játszma jóváhagyására: <link>" (bold name when not pingable). */
export function reminderLine(player: { name: string; discordId: string | null }, timeLeft: string, url: string, last: boolean): string {
  const who = player.discordId ? `<@${player.discordId}>` : `**${player.name}**`;
  const lead = last ? "⏰ Utolsó szólás:" : "⏳";
  return `${lead} ${who}, ${timeLeft} maradt a játszma jóváhagyására: ${url}`;
}

/**
 * Sent when a game is reported or corrected: pings the player who now has to answer.
 * "🎲 @Opponent, **Reporter** beküldött egy ranked játszmát, nézd meg és hagyd jóvá: <link>"
 */
export function reportLine(
  to: { name: string; discordId: string | null },
  by: string,
  context: "casual" | "ranked",
  corrected: boolean,
  url: string,
): string {
  const who = to.discordId ? `<@${to.discordId}>` : `**${to.name}**`;
  const what = corrected ? `kijavította a(z) ${context} játszmátok eredményét` : `beküldött egy ${context} játszmát`;
  return `🎲 ${who}, **${by}** ${what}, nézd meg és hagyd jóvá: ${url}`;
}
