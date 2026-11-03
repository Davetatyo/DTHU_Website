// Admin badge try-on (testing only, 2026-11-03). An admin picks a badge on Profilom and wears
// it on their own header chip and profile. The choice is a cookie in that admin's browser,
// not a database row, so nobody else can ever see it: the badge is only drawn for the
// signed-in visitor themself, and only when they are a real admin. Players get the real
// collection (R3 Gyűjtemény) later.

import { cookies } from "next/headers";
import { getCurrentProfile, sameName } from "@/lib/auth";
import { findBadge, type Badge } from "./badges";

export const TEST_BADGE_COOKIE = "teszt_jelveny";

/** The badge the signed-in admin is trying on, or null (also for everyone who isn't an admin). */
export async function getTestBadge(): Promise<Badge | null> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return null;
  return findBadge((await cookies()).get(TEST_BADGE_COOKIE)?.value);
}

/** The admin's test badge when `karnyxName` is the admin themself, so lists show it only on
 *  their own picture and only to them. */
export async function getOwnTestBadge(karnyxName: string | null): Promise<Badge | null> {
  if (!karnyxName) return null;
  const profile = await getCurrentProfile();
  if (!profile?.is_admin || !sameName(profile.karnyx_name, karnyxName)) return null;
  return getTestBadge();
}
