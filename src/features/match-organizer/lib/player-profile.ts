import type { Player, Profile } from "./types";

// The account behind a tournament player, from a map built by getProfilesByKarnyx (data.ts).
// A player linked to an account (players.profile_id, migration 0014) is looked up by that ID, so
// a renamed Karnyx name still finds them; unlinked Karnyx-league players by name (until R20).
// Pure, so the Discord helpers can use it too.

/** Map key for a profile ID. The NUL prefix can't occur in a Karnyx name, so keys never clash. */
export const profileIdKey = (id: string) => `\u0000id:${id}`;

/** Map key for a Karnyx name. */
export const profileNameKey = (name: string) => name.toLowerCase();

export function profileFor(map: Map<string, Profile>, player: Pick<Player, "karnyx_name" | "profile_id"> | null | undefined): Profile | null {
  if (!player) return null;
  if (player.profile_id) return map.get(profileIdKey(player.profile_id)) ?? null;
  return map.get(profileNameKey(player.karnyx_name)) ?? null;
}
