import { getAdminView, getCurrentProfile } from "@/lib/auth";

/**
 * true = admins only (admin view). false = every logged-in player, as the owner agreed
 * (2026-11-13). Switched off the same day: players see the "Játékosok" tab and stats links
 * right away; their numbers fill up as Bajnokságok results are confirmed.
 */
export const PLAYER_STATS_ADMINS_ONLY = false;

/** Whether this visitor may open stats pages (their own and other players'). */
export async function canSeePlayerStats(): Promise<boolean> {
  if (PLAYER_STATS_ADMINS_ONLY) return getAdminView();
  return !!(await getCurrentProfile());
}
