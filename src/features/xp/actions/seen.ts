"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

/** The player has seen their new XP (notification or level-up popup): don't show it again. */
export async function markXpSeen(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  await createAdminClient()
    .from("xp_events")
    .update({ seen_at: new Date().toISOString() })
    .eq("profile_id", profile.id)
    .is("seen_at", null);
}
