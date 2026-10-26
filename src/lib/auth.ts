import { redirect } from "next/navigation";
import { createAdminClient, createSessionClient } from "./supabase/server";
import type { Profile } from "./types";

/** The signed-in visitor's profile, or null for anonymous visitors. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await createAdminClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.is_admin) redirect("/");
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
