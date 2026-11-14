import { getAdminView, getCurrentProfile } from "@/lib/auth";

/**
 * true = admins only (admin view), the agreed first release (R17 decision 6). false = every
 * logged-in player.
 */
export const MATCH_REPORTING_ADMINS_ONLY = true;

/** Whether this visitor may use the Játszmák pages (report, answer, see their games). */
export async function canUseMatchReporting(): Promise<boolean> {
  if (MATCH_REPORTING_ADMINS_ONLY) return getAdminView();
  return !!(await getCurrentProfile());
}
