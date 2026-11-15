// How a match is played (owner/admin request, 2026-11-03). Each player picks TTS or webcam for
// themselves on the match page, while proposing or accepting a time, or later on the agreed
// match. Not choosing counts as webcam. The match is TTS when both play TTS, Webkamera when
// both use a webcam, Hibrid when one does each. Pure functions, unit-tested.

import type { MatchView } from "./types";

// Same rule as sameName() in lib/auth.ts, kept here so this file has no server imports.
const sameName = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export type PlayMode = "tts" | "webcam";
export type MatchMode = "tts" | "webcam" | "hybrid";

export const PLAY_MODE_LABELS: Record<PlayMode, string> = { tts: "TTS", webcam: "Webkamera" };
export const MATCH_MODE_LABELS: Record<MatchMode, string> = { tts: "TTS", webcam: "Webkamera", hybrid: "Hibrid" };

/** The values in the address (?mod=…) for the Közelgő meccsek filter. */
export const MODE_PARAM: Record<string, MatchMode> = { tts: "tts", webkamera: "webcam", hibrid: "hybrid" };
export const PARAM_FOR: Record<MatchMode, string> = { tts: "tts", webcam: "webkamera", hybrid: "hibrid" };

/** A submitted choice: "tts", "webcam", or anything else = not chosen. */
export const parsePlayMode = (value: unknown): PlayMode | null => (value === "tts" || value === "webcam" ? value : null);

/** The match's mode; null for a Bye. A player who hasn't chosen counts as webcam. */
export function matchMode(match: Pick<MatchView, "mode_a" | "mode_b" | "player_b_id">): MatchMode | null {
  if (!match.player_b_id) return null;
  const a = match.mode_a ?? "webcam";
  const b = match.mode_b ?? "webcam";
  return a === b ? a : "hybrid";
}

/**
 * Who someone is, for finding their side of a match: the profile ID decides; the Karnyx name is
 * only used for Karnyx-league players without a linked account (until R20 retires Karnyx).
 */
export type Identity = { id: string; karnyx_name: string | null };

/**
 * Whether a tournament player is this person. A player linked to an account (players.profile_id,
 * migration 0014) matches only that account, so a renamed Karnyx name can't match someone else's
 * entry; an unlinked player (Karnyx league) is matched by Karnyx name.
 */
export function isPlayer(
  player: { karnyx_name: string; profile_id?: string | null } | null | undefined,
  who: Identity | null | undefined,
): boolean {
  if (!player || !who) return false;
  if (player.profile_id) return player.profile_id === who.id;
  return sameName(player.karnyx_name, who.karnyx_name);
}

/** Which side of the match a person is on (see isPlayer). */
export function sideOf(match: Pick<MatchView, "a" | "b">, who: Identity | null | undefined): "a" | "b" | null {
  if (isPlayer(match.a, who)) return "a";
  if (isPlayer(match.b, who)) return "b";
  return null;
}

/** Whether a row shows its mode: once agreed or played, or as soon as someone has chosen. */
export const showsMode = (match: Pick<MatchView, "status" | "mode_a" | "mode_b" | "player_b_id">) =>
  !!match.player_b_id && (match.status === "confirmed" || match.status === "played" || !!match.mode_a || !!match.mode_b);
