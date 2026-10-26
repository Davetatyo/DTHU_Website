import type { Profile } from "./types";

/** Value of the "I'm not playing" choice in the profile form (organisers, spectators). */
export const NOT_PLAYING = "__nem_jatszom__";

/**
 * A profile counts as finished once it was saved, which always sets the Facebook name.
 * Players also have a Karnyx name; organisers and spectators may not.
 */
export function isProfileComplete(profile: Pick<Profile, "facebook_name">): boolean {
  return !!profile.facebook_name;
}

/**
 * Turns the profile form's Karnyx choice into the name to save: null for "not playing",
 * the roster's spelling for a player, or an error message.
 */
export function resolveKarnyxChoice(
  input: string,
  roster: string[],
): { ok: true; name: string | null } | { ok: false; error: string } {
  const choice = input.trim();
  if (choice === NOT_PLAYING) return { ok: true, name: null };
  if (roster.length === 0) return { ok: true, name: choice || null };
  if (!choice) return { ok: false, error: "Válaszd ki a Karnyx nevedet, vagy a „Nem játszom” lehetőséget." };
  const match = roster.find((n) => n.toLowerCase() === choice.toLowerCase());
  return match ? { ok: true, name: match } : { ok: false, error: "Ez a név nem szerepel a verseny játékosai között." };
}
