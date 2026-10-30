import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { routes } from "./routes";
import { createAdminClient, createSessionClient } from "./supabase/server";
import type { Profile } from "./types";
import { VIEW_AS_COOKIE, wantsPlayerView } from "./view-as";

/**
 * The signed-in visitor's profile, or null for anonymous visitors.
 * Cached per request: the layout, header and page can all ask without extra queries.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await createAdminClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

/**
 * Whether the page should show admin things (admin menu, tools, the hidden site): the visitor
 * is an admin and hasn't switched to the player view. Permissions themselves always use
 * profile.is_admin (requireAdmin), never this.
 */
export const getAdminView = cache(async (): Promise<boolean> => {
  const profile = await getCurrentProfile();
  return !!profile?.is_admin && !wantsPlayerView((await cookies()).get(VIEW_AS_COOKIE)?.value);
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(routes.login);
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.is_admin) redirect(routes.organizer);
  return profile;
}

/** Discord usernames (comma separated) that become admin on first login. */
export function isBootstrapAdmin(discordUsername: string | null): boolean {
  if (!discordUsername) return false;
  const list = (process.env.BOOTSTRAP_ADMIN_DISCORD ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(discordUsername.toLowerCase());
}

export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}
