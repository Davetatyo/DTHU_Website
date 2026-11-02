// Who may upload a profile picture. Server-only: reads BOOTSTRAP_ADMIN_DISCORD.

import { isBootstrapAdmin } from "@/lib/auth";
import type { Profile } from "@/lib/types";

/**
 * Test phase: only the bootstrap admin (BOOTSTRAP_ADMIN_DISCORD, i.e. the owner) can upload
 * their own picture. Set to false to open uploads to every logged-in user. Admins can always
 * remove or replace a picture on the admin "Profil szerkesztése" page.
 */
export const AVATAR_TEST_MODE = true;

export function canUploadOwnAvatar(profile: Pick<Profile, "discord_username">): boolean {
  return !AVATAR_TEST_MODE || isBootstrapAdmin(profile.discord_username);
}
