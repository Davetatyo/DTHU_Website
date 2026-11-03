// Who may upload a profile picture. Server-only: reads BOOTSTRAP_ADMIN_DISCORD.

import { isBootstrapAdmin } from "@/lib/auth";
import type { Profile } from "@/lib/types";

/**
 * Test phase switch. true: only the bootstrap admin (BOOTSTRAP_ADMIN_DISCORD, i.e. the owner)
 * can upload their own picture. false (since v2.2, 2026-11-02): every logged-in user can.
 * Admins can always remove or replace a picture on the admin "Profil szerkesztése" page.
 */
export const AVATAR_TEST_MODE = false;

export function canUploadOwnAvatar(profile: Pick<Profile, "discord_username">, testMode = AVATAR_TEST_MODE): boolean {
  return !testMode || isBootstrapAdmin(profile.discord_username);
}
