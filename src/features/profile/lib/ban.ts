// Banning users: who may be banned. Pure logic, used by the admin page and the ban action.

import { isBootstrapAdmin } from "@/lib/auth";
import type { Profile } from "@/lib/types";

/** Supabase Auth ban length: effectively forever (100 years). "none" lifts it. */
export const AUTH_BAN_DURATION = "876000h";

export function isBanned(profile: Pick<Profile, "banned_at"> | null | undefined): boolean {
  return !!profile?.banned_at;
}

/**
 * Why the actor can't ban the target, in Hungarian, or null when the ban is allowed.
 * Nobody bans themselves, and admins must lose their admin role first, so one admin can't
 * lock out another by accident. The owner (bootstrap admin) can't be banned at all.
 */
export function banBlockReason(
  actor: Pick<Profile, "id" | "is_admin">,
  target: Pick<Profile, "id" | "is_admin" | "discord_username" | "banned_at">,
): string | null {
  if (!actor.is_admin) return "Csak admin tilthat ki felhasználót.";
  if (actor.id === target.id) return "Saját magadat nem tilthatod ki.";
  if (isBootstrapAdmin(target.discord_username)) return "A fő admint nem lehet kitiltani.";
  if (target.is_admin) return "Adminot nem lehet kitiltani. Előbb vedd el az admin jogát.";
  if (isBanned(target)) return "Ez a felhasználó már ki van tiltva.";
  return null;
}
