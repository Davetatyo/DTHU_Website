"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { removeAvatar } from "@/features/profile/lib/avatar-store";
import { AUTH_BAN_DURATION, banBlockReason } from "@/features/profile/lib/ban";

function back(profileId: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath("/", "layout");
  redirect(`${routes.adminUser(profileId)}?${key}=${encodeURIComponent(text)}`);
}

async function loadTarget(formData: FormData): Promise<Profile> {
  const id = String(formData.get("profile_id") ?? "");
  const { data } = /^[0-9a-f-]{36}$/i.test(id)
    ? await createAdminClient().from("profiles").select("*").eq("id", id).maybeSingle()
    : { data: null };
  if (!data) redirect(`${routes.admin}?hiba=${encodeURIComponent("A felhasználó nem található.")}`);
  return data as Profile;
}

/**
 * Bans a user: their Discord account can't log in again and their current session ends on
 * the next page load (middleware). The profile row stays, marked banned, so the ban sticks to
 * the Discord ID. Their picture is deleted; matches and the roster are untouched.
 */
export async function banUser(formData: FormData) {
  const actor = await requireAdmin();
  const target = await loadTarget(formData);
  const blocked = banBlockReason(actor, target);
  if (blocked) back(target.id, "hiba", blocked);

  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ banned_at: new Date().toISOString(), banned_by: actor.id })
    .eq("id", target.id);
  if (error) back(target.id, "hiba", "A kitiltás nem sikerült. Lefuttattad a 0002-es adatbázis-frissítést?");

  await removeAvatar(target.id);
  // Supabase Auth refuses logins and session refreshes for this account from now on.
  const { error: authError } = await db.auth.admin.updateUserById(target.id, { ban_duration: AUTH_BAN_DURATION });

  const who = target.display_name || target.discord_username || "A felhasználó";
  back(
    target.id,
    "uzenet",
    authError
      ? `${who} kitiltva az oldalról (a Discord-belépés tiltása nem sikerült, de az oldal így is kizárja).`
      : `${who} kitiltva: a Discord fiókjával többé nem tud belépni.`,
  );
}

/** Lifts a ban: the user can log in with Discord again. */
export async function unbanUser(formData: FormData) {
  await requireAdmin();
  const target = await loadTarget(formData);
  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ banned_at: null, banned_by: null }).eq("id", target.id);
  if (error) back(target.id, "hiba", "A tiltás feloldása nem sikerült, próbáld újra.");
  await db.auth.admin.updateUserById(target.id, { ban_duration: "none" });
  back(target.id, "uzenet", `${target.display_name || target.discord_username} tiltása feloldva, újra beléphet.`);
}
