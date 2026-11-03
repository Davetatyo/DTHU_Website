// Site-wide types. Feature-specific types live in src/features/<feature>/lib/types.ts.

/** One per Discord login. karnyx_name links the account to the Meccsszervező roster. */
export type Profile = {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  display_name: string | null;
  karnyx_name: string | null;
  facebook_name: string | null;
  timezone: string;
  is_admin: boolean;
  /** Path of the profile picture in the "avatars" storage bucket; null = default icon. */
  avatar_path?: string | null;
  /** Set when an admin banned the user (migration 0002). Banned users can't log in. */
  banned_at?: string | null;
  banned_by?: string | null;
};
