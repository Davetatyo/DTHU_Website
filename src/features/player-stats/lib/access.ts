import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { canUseMatchReporting } from "@/features/match-reporting/lib/access";
import type { StatContext } from "./stats";

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

/**
 * Which games this visitor's stats count. Casual and ranked games (Játszmák, R17) only once the
 * visitor can use the Játszmák pages (admins only while MATCH_REPORTING_ADMINS_ONLY), so test
 * games don't show up in players' stats before the release.
 */
export async function statContexts(): Promise<StatContext[]> {
  return (await canUseMatchReporting()) ? ["tournament", "ranked", "casual"] : ["tournament"];
}
