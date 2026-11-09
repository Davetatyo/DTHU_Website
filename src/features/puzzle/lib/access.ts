// Who can open the Taktikai feladvány. An experiment for now (owner, 2026-11-09): admins only,
// in admin view. Set to false to open it to everyone who can see the Játékok page.

export const PUZZLE_ADMINS_ONLY = true;

/**
 * The local dev server (`npm run dev`) opens it without logging in, so the owner can test it on
 * localhost (owner, 2026-11-09). Production builds (dthu.hu, Vercel previews) are never "development".
 */
export const PUZZLE_OPEN_IN_DEV = process.env.NODE_ENV === "development";

export function canOpenPuzzles(adminView: boolean, adminsOnly: boolean = PUZZLE_ADMINS_ONLY): boolean {
  return !adminsOnly || adminView || PUZZLE_OPEN_IN_DEV;
}
