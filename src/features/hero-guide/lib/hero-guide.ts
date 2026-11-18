// Rules of the Hős segédlet (owner, 2026-11-05). Pure and browser-safe.

/** true = admins only (the test phase until 2026-11-18). false = everyone who is logged in. */
export const HERO_GUIDE_ADMINS_ONLY = false;

/**
 * Whether this visitor gets the Hős segédlet of a match. A hero roster doesn't depend on the match's
 * time or state, so every match with an opponent has one, before and after it's played, for everyone
 * who is logged in. A Bye has nobody to read up on. `isAdmin` follows the header's admin/player switch.
 */
export function canOpenHeroGuide(
  who: { hasOpponent: boolean; isLoggedIn: boolean; isAdmin: boolean },
  adminsOnly: boolean = HERO_GUIDE_ADMINS_ONLY,
): boolean {
  if (!who.hasOpponent) return false;
  return adminsOnly ? who.isAdmin : who.isLoggedIn;
}

/** The Szabálytár id of a hero name on a player's roster: "Pale Lady" → "pale-lady". */
export function heroIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

/** Your opponent comes first: that's who you came to read up on. Otherwise the match's order. */
export function opponentFirst<T extends { isMe: boolean }>(sides: [T, T]): [T, T] {
  return sides[0].isMe ? [sides[1], sides[0]] : sides;
}
