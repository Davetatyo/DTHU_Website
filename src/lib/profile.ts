import type { Profile } from "./types";

/** Value of the "I'm not playing" choice in the profile form (organisers, spectators). */
export const NOT_PLAYING = "__nem_jatszom__";

/** Value of the "Egyedi" choice: the player types a Karnyx name that isn't on the roster yet. */
export const CUSTOM_NAME = "__egyedi__";

const MAX_NAME_LENGTH = 40;

/**
 * A profile counts as finished once it was saved, which always sets the Facebook name.
 * Players also have a Karnyx name; organisers and spectators may not.
 */
export function isProfileComplete(profile: Pick<Profile, "facebook_name">): boolean {
  return !!profile.facebook_name;
}

/** Cleans a typed Karnyx name, or explains what's wrong with it. */
export function cleanKarnyxName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, error: "Írd be a Karnyx nevedet pontosan úgy, ahogy a Karnyxban szerepel." };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, error: `A Karnyx név legfeljebb ${MAX_NAME_LENGTH} karakter lehet.` };
  if (name.startsWith("__")) return { ok: false, error: "Érvénytelen Karnyx név." };
  return { ok: true, name };
}

/**
 * Turns the profile form's Karnyx choice into the name to save: null for "not playing",
 * the roster's spelling for a listed player, the typed name for "Egyedi", or an error.
 */
export function resolveKarnyxChoice(
  input: string,
  roster: string[],
  customInput = "",
): { ok: true; name: string | null } | { ok: false; error: string } {
  const choice = input.trim();
  if (choice === NOT_PLAYING) return { ok: true, name: null };

  const onRoster = (name: string) => roster.find((n) => n.toLowerCase() === name.toLowerCase());

  if (choice === CUSTOM_NAME) {
    const cleaned = cleanKarnyxName(customInput);
    if (!cleaned.ok) return cleaned;
    // Typed a name that is on the roster after all: use the roster's spelling.
    return { ok: true, name: onRoster(cleaned.name) ?? cleaned.name };
  }

  if (roster.length === 0) return { ok: true, name: choice || null };
  if (!choice) return { ok: false, error: "Válaszd ki a Karnyx nevedet, az „Egyedi” vagy a „Nem játszom” lehetőséget." };
  const match = onRoster(choice);
  return match ? { ok: true, name: match } : { ok: false, error: "Ez a név nem szerepel a verseny játékosai között." };
}
