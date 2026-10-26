// Posts to the tournament's Discord channel through a webhook.
// Players who logged in get a real @mention; everyone else appears in bold.

import type { Player, Profile } from "./types";

const MAX_MESSAGE = 1900; // Discord's limit is 2000 characters

export function mention(player: Player | null, profiles: Map<string, Profile>): string {
  if (!player) return "**erőnyerő**";
  const profile = profiles.get(player.karnyx_name.toLowerCase());
  return profile?.discord_id ? `<@${profile.discord_id}>` : `**${player.karnyx_name}**`;
}

/** Splits lines into messages under Discord's length limit. */
export function chunkLines(lines: string[], max = MAX_MESSAGE): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > max && current) {
      chunks.push(current);
      current = line.slice(0, max);
    } else {
      current = next.slice(0, max);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function mentionedIds(content: string): string[] {
  return [...content.matchAll(/<@(\d+)>/g)].map((m) => m[1]);
}

/** Sends the lines to Discord. Failures are logged, never thrown, so they don't break the app. */
export async function postToDiscord(lines: string[]): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    for (const content of chunkLines(lines)) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          allowed_mentions: { parse: [], users: [...new Set(mentionedIds(content))].slice(0, 100) },
        }),
      });
      if (!res.ok) {
        console.error("Discord webhook hiba", res.status, await res.text());
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error("Discord webhook hiba", err);
    return false;
  }
}
