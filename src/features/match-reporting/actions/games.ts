"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { HERO_NAMES } from "@/lib/heroes";
import { routes } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import { postToDiscord } from "@/features/match-organizer/lib/discord";
import { reportLine } from "@/features/match-reporting/lib/messages";
import { canUseMatchReporting } from "@/features/match-reporting/lib/access";
import { getGame } from "@/features/match-reporting/lib/data";
import { gameErrorMessage } from "@/features/match-reporting/lib/errors";
import { readRelative, toSideInput } from "@/features/match-reporting/lib/form";
import { sameResult, validateGameResult, validateNewGame } from "@/features/match-reporting/lib/report";
import { gameRights, gameSide } from "@/features/match-reporting/lib/rights";

// Standalone games (casual / ranked): report, confirm or correct, withdraw. Every change goes
// through a game_* database function (migration 0014), which checks the same rules again.

/** at: when the error was made, so the form can rebuild its fields (React resets a form after its action). */
export type FormState = { error: string; at: number } | null;

const fail = (error: string): FormState => ({ error, at: Date.now() });

function done(gameId: string, text: string): never {
  revalidatePath(routes.gameLog);
  revalidatePath(routes.gameView(gameId));
  redirect(`${routes.gameView(gameId)}?uzenet=${encodeURIComponent(text)}`);
}

function failed(gameId: string, text: string): never {
  redirect(`${routes.gameView(gameId)}?hiba=${encodeURIComponent(text)}`);
}

/**
 * Pings the player who now has to answer, in the Időpontfoglaló's Discord channel. Never throws:
 * a failed post must not undo a saved report.
 */
async function pingAnswerer(gameId: string, toProfileId: string, byName: string, context: "casual" | "ranked", corrected: boolean) {
  try {
    const { data: to } = await createAdminClient()
      .from("profiles")
      .select("karnyx_name, display_name, discord_id")
      .eq("id", toProfileId)
      .maybeSingle();
    const name = to?.karnyx_name ?? to?.display_name ?? "?";
    await postToDiscord([reportLine({ name, discordId: to?.discord_id ?? null }, byName, context, corrected, `${await getSiteUrl()}${routes.gameView(gameId)}`)]);
  } catch (err) {
    console.error("Játszma-értesítés hiba", err);
  }
}

const nameOf = (p: { karnyx_name: string | null; display_name: string | null }) => p.karnyx_name ?? p.display_name ?? "Valaki";

async function viewer() {
  const profile = await requireProfile();
  if (!(await canUseMatchReporting())) redirect(routes.organizer);
  return profile;
}

/** Új játszma: the reporter is side a; the opponent has to confirm. */
export async function reportGame(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await viewer();
  const rel = readRelative(formData);
  const checked = validateNewGame(
    { ...toSideInput(rel, "a"), context: String(formData.get("context") ?? ""), opponent_id: String(formData.get("opponent_id") ?? "") },
    profile.id,
    { heroNames: HERO_NAMES, timeZone: profile.timezone, now: new Date() },
  );
  if (!checked.ok) return fail(checked.error);

  const { data, error } = await createAdminClient().rpc("game_report", {
    p_by: profile.id,
    p_context: checked.value.context,
    p_source: "web",
    p_profile_a: profile.id,
    p_profile_b: checked.value.opponentId,
    p_fields: checked.value.fields,
  });
  if (error || !data) return fail(gameErrorMessage(error?.message));
  await pingAnswerer(String(data), checked.value.opponentId, nameOf(profile), checked.value.context, false);
  done(String(data), "Játszma elküldve. Az ellenfeled jóváhagyására vár.");
}

/** Javítom: the other player sends a different result (the same one counts as confirming). */
export async function correctGame(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await viewer();
  const game = await getGame(String(formData.get("game_id") ?? ""));
  if (!game) return fail("A játszma nem található.");
  const side = gameSide(game, profile.id);
  if (!side || !gameRights(game, { id: profile.id, admin: profile.is_admin }).canRespond) {
    return fail("Ez a játszma már nem vár a te válaszodra.");
  }
  if (String(formData.get("seen") ?? "") !== game.reported_at) {
    return fail("Közben változott a játszma, frissítsd az oldalt és nézd meg újra.");
  }

  const checked = validateGameResult(toSideInput(readRelative(formData), side), {
    heroNames: HERO_NAMES,
    timeZone: profile.timezone,
    now: new Date(),
    since: new Date(game.created_at),
  });
  if (!checked.ok) return fail(checked.error);

  const { data, error } = await createAdminClient().rpc("game_respond", {
    p_game: game.id,
    p_by: profile.id,
    p_seen: game.reported_at,
    p_fields: sameResult(game, checked.value) ? null : checked.value,
  });
  if (error) return fail(gameErrorMessage(error.message));
  if (data === "corrected" && game.context !== "tournament") {
    await pingAnswerer(game.id, side === "a" ? game.profile_b : game.profile_a, nameOf(profile), game.context, true);
  }
  const opponent = side === "a" ? game.b.name : game.a.name;
  done(game.id, data === "confirmed" ? "Jóváhagytad, a játszma végleges." : `Javítás elküldve. ${opponent} jóváhagyására vár.`);
}

/** Elfogadom: the other player confirms the pending version they saw. */
export async function confirmGame(formData: FormData) {
  const profile = await viewer();
  const id = String(formData.get("game_id") ?? "");
  const { error } = await createAdminClient().rpc("game_respond", {
    p_game: id,
    p_by: profile.id,
    p_seen: String(formData.get("seen") ?? ""),
    p_fields: null,
  });
  if (error) failed(id, gameErrorMessage(error.message));
  done(id, "Jóváhagytad, a játszma végleges.");
}

/** Max length of an admin's reason (the database keeps the first 300 characters). */
const MAX_REASON = 300;

function readReason(formData: FormData): string {
  return String(formData.get("reason") ?? "").trim();
}

/**
 * Admin: sets a casual / ranked game's result (fields from side a's view); a pending game becomes
 * final. Not on a game the admin plays while it is pending (rights.ts, game_admin_edit).
 */
export async function adminEditGame(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const game = await getGame(String(formData.get("game_id") ?? ""));
  if (!game) return fail("A játszma nem található.");
  if (!gameRights(game, { id: admin.id, admin: true }).canAdminEdit) return fail("Ezt a játszmát most nem módosíthatod.");
  const reason = readReason(formData);
  if (!reason) return fail("Írd be az indoklást.");
  if (reason.length > MAX_REASON) return fail(`Az indoklás legfeljebb ${MAX_REASON} karakter lehet.`);

  const checked = validateGameResult(toSideInput(readRelative(formData), "a"), {
    heroNames: HERO_NAMES,
    timeZone: admin.timezone,
    now: new Date(),
    since: new Date(game.created_at),
  });
  if (!checked.ok) return fail(checked.error);

  const { error } = await createAdminClient().rpc("game_admin_edit", {
    p_game: game.id,
    p_by: admin.id,
    p_fields: checked.value,
    p_reason: reason,
  });
  if (error) return fail(gameErrorMessage(error.message));
  revalidatePath(routes.adminGames);
  done(game.id, game.status === "pending" ? "Módosítva, a játszma végleges." : "Módosítva.");
}

/** Admin: voids a casual / ranked game (it no longer counts anywhere). The reason is required. */
export async function voidGame(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("game_id") ?? "");
  const reason = readReason(formData);
  if (!reason) failed(id, "Írd be az indoklást.");
  if (reason.length > MAX_REASON) failed(id, `Az indoklás legfeljebb ${MAX_REASON} karakter lehet.`);
  const { error } = await createAdminClient().rpc("game_void", { p_game: id, p_by: admin.id, p_reason: reason });
  if (error) failed(id, gameErrorMessage(error.message));
  revalidatePath(routes.adminGames);
  done(id, "Érvénytelenítve: a játszma már nem számít bele semmibe.");
}

/** Visszavonom: the player whose version is pending withdraws it. */
export async function cancelGame(formData: FormData) {
  const profile = await viewer();
  const id = String(formData.get("game_id") ?? "");
  const { error } = await createAdminClient().rpc("game_cancel", { p_game: id, p_by: profile.id });
  if (error) failed(id, gameErrorMessage(error.message));
  done(id, "Visszavontad a játszmát.");
}
