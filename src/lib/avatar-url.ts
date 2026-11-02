// Where profile pictures live. Site-wide because the header shows the signed-in user's
// picture; the upload rules are in features/profile.

import { publicStorageUrl } from "./storage-url";

/** Storage bucket (created by supabase/migrations/0002_profile_avatars_and_bans.sql). */
export const AVATAR_BUCKET = "avatars";

/** Public address of a stored picture, or null when there is none. */
export function avatarPublicUrl(path: string | null | undefined, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  return publicStorageUrl(AVATAR_BUCKET, path, supabaseUrl);
}
