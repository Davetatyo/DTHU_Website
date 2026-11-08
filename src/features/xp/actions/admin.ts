"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, sameName } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { getPlayers, getProfilesByKarnyx, getRoundMatches, getRounds } from "@/features/match-organizer/lib/data";
import { wallTimeToUtc } from "@/features/match-organizer/lib/time";
import { awardXp } from "../lib/award";
import { tournamentFinishers } from "../lib/finishers";
import { isValidCurve } from "../lib/levels";
import { ACTIVITY, isValidAdjustment } from "../lib/rules";

function done(key: "uzenet" | "hiba", text: string, user?: string): never {
  revalidatePath("/", "layout");
  const q = new URLSearchParams({ [key]: text, ...(user ? { user } : {}) });
  redirect(`${routes.adminXp}?${q}`);
}

async function log(actorId: string, action: string, entityId: string | null, before: unknown, after: unknown, reason?: string) {
  await createAdminClient()
    .from("audit_log")
    .insert({ actor_id: actorId, action, entity_type: "xp", entity_id: entityId, before, after, reason: reason ?? null });
}

/** Give or take XP by hand, with a reason. */
export async function adjustXp(formData: FormData) {
  const admin = await requireAdmin();
  const profileId = String(formData.get("profile_id") ?? "");
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!profileId) done("hiba", "Válassz felhasználót.");
  if (!isValidAdjustment(amount)) done("hiba", "Az XP 5-tel osztható szám legyen, legfeljebb ±1000 (nem 0).", profileId);
  if (!reason) done("hiba", "Írd be az okát: a játékos ezt látja.", profileId);
  const { data, error } = await createAdminClient().rpc("xp_admin_adjust", {
    p_profile: profileId,
    p_amount: amount,
    p_reason: reason,
    p_by: admin.id,
  });
  if (error) {
    const text = error.message.includes("below_zero")
      ? "Ennyit nem lehet levonni: az összes XP nem mehet nulla alá."
      : "Nem sikerült. Lefutott a 0012-es migráció?";
    done("hiba", text, profileId);
  }
  await log(admin.id, "xp_adjust", profileId, null, { amount, total: data }, reason);
  done("uzenet", `${amount > 0 ? "+" : ""}${amount} XP rögzítve. Új összeg: ${data} XP.`, profileId);
}

/** Amounts and on/off for each activity. Applies from now on; given XP never changes. */
export async function saveActivities(formData: FormData) {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: rows, error } = await db.from("xp_activities").select("*");
  if (error) done("hiba", "Nem sikerült. Lefutott a 0012-es migráció?");
  let changed = 0;
  for (const row of rows ?? []) {
    const amount = Number(formData.get(`amount_${row.key}`));
    const active = formData.get(`active_${row.key}`) === "on";
    if (!Number.isInteger(amount) || amount < 0 || amount > 1000 || amount % 5 !== 0) {
      done("hiba", `„${row.name}”: az XP 0 és 1000 közötti, 5-tel osztható szám legyen.`);
    }
    if (amount === row.amount && active === row.active) continue;
    await db.from("xp_activities").update({ amount, active, updated_at: new Date().toISOString() }).eq("key", row.key);
    await log(admin.id, "xp_activity", row.key, { amount: row.amount, active: row.active }, { amount, active });
    changed++;
  }
  done("uzenet", changed ? `${changed} tevékenység mentve. Mostantól így számít.` : "Nem változott semmi.");
}

export async function saveCurve(formData: FormData) {
  const admin = await requireAdmin();
  const curve = { first: Number(formData.get("first")), step: Number(formData.get("step")) };
  if (!isValidCurve(curve)) done("hiba", "Mindkét szám pozitív és 5-tel osztható legyen (legfeljebb 500).");
  const db = createAdminClient();
  const { data: before } = await db.from("xp_config").select("value").eq("key", "curve").maybeSingle();
  const { error } = await db.from("xp_config").upsert({ key: "curve", value: curve, updated_at: new Date().toISOString() });
  if (error) done("hiba", "Nem sikerült. Lefutott a 0012-es migráció?");
  await log(admin.id, "xp_curve", "curve", before?.value ?? null, curve);
  done("uzenet", "Szintgörbe mentve.");
}

/** Double XP: for a tournament (all of its XP), or a time window for chosen activities. */
export async function addBoost(formData: FormData) {
  const admin = await requireAdmin();
  const multiplier = Number(formData.get("multiplier")) === 3 ? 3 : 2;
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const row: Record<string, unknown> = { multiplier, note, created_by: admin.id };
  if (formData.get("mode") === "tournament") {
    if (!tournamentId) done("hiba", "Válassz versenyt.");
    row.tournament_id = tournamentId;
  } else {
    let starts: Date;
    let ends: Date;
    try {
      starts = wallTimeToUtc(String(formData.get("starts_at")), admin.timezone);
      ends = wallTimeToUtc(String(formData.get("ends_at")), admin.timezone);
    } catch {
      done("hiba", "Add meg a kezdetet és a véget.");
    }
    if (ends <= starts) done("hiba", "A vége legyen a kezdet után.");
    const keys = formData.getAll("activity").map(String).filter(Boolean);
    row.starts_at = starts.toISOString();
    row.ends_at = ends.toISOString();
    row.activity_keys = keys.length ? keys : null;
  }
  const { data, error } = await createAdminClient().from("xp_boosts").insert(row).select("id").single();
  if (error) done("hiba", "Nem sikerült. Lefutott a 0012-es migráció?");
  await log(admin.id, "xp_boost_add", data.id, null, row);
  done("uzenet", `${multiplier}× XP beállítva.`);
}

export async function removeBoost(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = createAdminClient();
  const { data: before } = await db.from("xp_boosts").select("*").eq("id", id).maybeSingle();
  await db.from("xp_boosts").delete().eq("id", id);
  await log(admin.id, "xp_boost_remove", id, before, null);
  done("uzenet", "Dupla XP törölve.");
}

/**
 * When a tournament ends: 30 XP to everyone who played or had a Bye in every round, the game XP
 * for each Bye, and the podium XP. Safe to press again: nothing is given twice.
 */
export async function awardTournament(formData: FormData) {
  const admin = await requireAdmin();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const rounds = await getRounds(tournamentId);
  if (rounds.length === 0) done("hiba", "Ennek a versenynek nincs fordulója.");
  const matches = (await Promise.all(rounds.map((r) => getRoundMatches(r.id)))).flat();
  const { finishers, byes } = tournamentFinishers(
    rounds.map((r) => r.id),
    matches.map((m) => ({ round_id: m.round_id, status: m.status, a: m.a.karnyx_name, b: m.b?.karnyx_name ?? null })),
  );
  const players = await getPlayers(tournamentId);
  const podium = [1, 2, 3].map((place) => String(formData.get(`place_${place}`) ?? "").trim());
  for (const name of podium) {
    if (name && !players.some((p) => sameName(p.karnyx_name, name))) done("hiba", `„${name}” nem játékosa ennek a versenynek.`);
  }
  const profiles = await getProfilesByKarnyx([...finishers, ...byes.map((b) => b.name), ...podium.filter(Boolean)]);
  const profileOf = (name: string) => profiles.get(name.toLowerCase());
  const opts = { tournamentId, by: admin.id };

  let given = 0;
  let missing = 0;
  for (const name of finishers) {
    const p = profileOf(name);
    if (p) given += await awardXp(p.id, ACTIVITY.tournamentFinish, `tournament:${tournamentId}`, opts);
    else missing++;
  }
  for (const bye of byes) {
    const p = profileOf(bye.name);
    if (p) given += await awardXp(p.id, ACTIVITY.tournamentGame, `bye:${bye.roundId}`, opts);
  }
  for (const [i, name] of podium.entries()) {
    const p = name ? profileOf(name) : undefined;
    if (p) given += await awardXp(p.id, ACTIVITY.podium[i], `tournament:${tournamentId}`, opts);
  }
  await log(admin.id, "xp_tournament", tournamentId, null, { finishers: finishers.length, byes: byes.length, podium, given });
  done(
    "uzenet",
    `Kiosztva: ${given} XP (${finishers.length} befejező, ${byes.length} Bye${podium.some(Boolean) ? ", dobogó" : ""}).` +
      (missing ? ` ${missing} befejező még nem regisztrált, ők nem kaptak.` : "") +
      " Újra megnyomva sem ad kétszer.",
  );
}
