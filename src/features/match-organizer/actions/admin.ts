"use server";

import { routes } from "@/lib/routes";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, sameName } from "@/lib/auth";
import { getActiveTournament, getPlayers, getRounds } from "@/features/match-organizer/lib/data";
import { postToDiscord } from "@/features/match-organizer/lib/discord";
import { byeWarnings, parseByeNames, parseKarnyxPaste } from "@/features/match-organizer/lib/karnyx";
import { getReminderTargets, notifyReminder, notifyRoundOpened } from "@/features/match-organizer/lib/notify";
import { resolveKarnyxChoice } from "@/features/match-organizer/lib/profile";
import { setMatchPlayed } from "@/features/match-organizer/lib/rounds";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import { wallTimeToUtc } from "@/features/match-organizer/lib/time";
import type { Profile } from "@/features/match-organizer/lib/types";

function done(key: "uzenet" | "hiba", text: string): never {
  revalidatePath("/", "layout");
  redirect(`${routes.admin}?${key}=${encodeURIComponent(text)}`);
}

export async function createTournament(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) done("hiba", "Adj nevet a versenynek.");
  const db = createAdminClient();
  await db.from("tournaments").update({ is_active: false }).eq("is_active", true);
  await db.from("tournaments").insert({ name });
  done("uzenet", `„${name}” verseny létrehozva. Jöhet az első forduló párosítása.`);
}

export async function importRound(formData: FormData) {
  const admin = await requireAdmin();
  const tournamentId = String(formData.get("tournament_id"));
  const { pairings, players } = parseKarnyxPaste(String(formData.get("text") ?? ""));
  if (pairings.length === 0) done("hiba", "Nem találtam párosítást a beillesztett szövegben.");
  // Karnyx leaves Bye players out of the copied pairings, so the admin types them in.
  const byes = parseByeNames(String(formData.get("bye") ?? ""));
  const [byeProblem] = byeWarnings(byes, pairings);
  if (byeProblem) done("hiba", byeProblem);

  let deadline: Date;
  try {
    deadline = wallTimeToUtc(String(formData.get("deadline")), admin.timezone);
  } catch {
    done("hiba", "Érvénytelen határidő.");
  }

  const db = createAdminClient();

  // Add new players to the roster and refresh everyone's heroes.
  const existing = await getPlayers(tournamentId);
  const idByName = new Map(existing.map((p) => [p.karnyx_name.toLowerCase(), p.id]));
  for (const p of players) {
    const id = idByName.get(p.name.toLowerCase());
    if (id) {
      await db.from("players").update({ heroes: p.heroes }).eq("id", id);
    } else {
      const { data, error } = await db
        .from("players")
        .insert({ tournament_id: tournamentId, karnyx_name: p.name, heroes: p.heroes })
        .select("id")
        .single();
      if (error || !data) done("hiba", `Nem sikerült felvenni: ${p.name}`);
      idByName.set(p.name.toLowerCase(), data.id);
    }
  }
  // Bye players already on the roster keep their heroes; unknown ones are added without heroes.
  for (const name of byes) {
    if (idByName.has(name.toLowerCase())) continue;
    const { data, error } = await db
      .from("players")
      .insert({ tournament_id: tournamentId, karnyx_name: name, heroes: [] })
      .select("id")
      .single();
    if (error || !data) done("hiba", `Nem sikerült felvenni: ${name}`);
    idByName.set(name.toLowerCase(), data.id);
  }

  const rounds = await getRounds(tournamentId);
  const now = new Date().toISOString();
  await db.from("rounds").update({ closed_at: now }).eq("tournament_id", tournamentId).is("closed_at", null);
  const { data: round, error } = await db
    .from("rounds")
    .insert({ tournament_id: tournamentId, number: (rounds[0]?.number ?? 0) + 1, deadline: deadline.toISOString() })
    .select()
    .single();
  if (error || !round) done("hiba", "Nem sikerült létrehozni a fordulót.");

  await db.from("matches").insert([
    ...pairings.map((pairing) => ({
      round_id: round.id,
      table_no: pairing.tableNo,
      player_a_id: idByName.get(pairing.a.name.toLowerCase()),
      player_b_id: pairing.b ? idByName.get(pairing.b.name.toLowerCase()) : null,
      status: pairing.b ? "pending" : "bye",
    })),
    ...byes.map((name, i) => ({
      round_id: round.id,
      table_no: pairings.length + i + 1,
      player_a_id: idByName.get(name.toLowerCase()),
      player_b_id: null,
      status: "bye",
    })),
  ]);

  await notifyRoundOpened(round, await getSiteUrl());
  done(
    "uzenet",
    `A ${round.number}. forduló elindult ${pairings.length} meccsel${byes.length ? `, Bye: ${byes.join(", ")}` : ""}.`,
  );
}

export async function updateDeadline(formData: FormData) {
  const admin = await requireAdmin();
  let deadline: Date;
  try {
    deadline = wallTimeToUtc(String(formData.get("deadline")), admin.timezone);
  } catch {
    done("hiba", "Érvénytelen határidő.");
  }
  await createAdminClient()
    .from("rounds")
    .update({ deadline: deadline.toISOString(), deadline_warning_sent: false })
    .eq("id", String(formData.get("round_id")));
  done("uzenet", "Határidő módosítva.");
}

/**
 * Deletes a whole tournament with its roster, rounds, matches and proposals (via cascade).
 * Player profiles and their Karnyx name claims are kept for the next tournament.
 */
export async function deleteTournament(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: tournament } = await db.from("tournaments").select("*").eq("id", String(formData.get("tournament_id"))).maybeSingle();
  if (!tournament) done("hiba", "A verseny nem található.");
  const typed = String(formData.get("confirm_name") ?? "").trim();
  if (typed.toLowerCase() !== String(tournament.name).trim().toLowerCase()) {
    done("hiba", `A törléshez pontosan írd be a verseny nevét: „${tournament.name}”.`);
  }
  const { error } = await db.from("tournaments").delete().eq("id", tournament.id);
  if (error) done("hiba", "A törlés nem sikerült, próbáld újra.");
  done("uzenet", `A(z) „${tournament.name}” verseny és minden fordulója törölve. Hozz létre újat, ha újrakezdenéd.`);
}

/** Deletes the latest round (e.g. after a wrong paste) and reopens the one before it. */
export async function deleteLatestRound(formData: FormData) {
  await requireAdmin();
  if (formData.get("confirm") !== "on") done("hiba", "Pipáld be a megerősítést a törléshez.");
  const tournamentId = String(formData.get("tournament_id"));
  const [latest, previous] = await getRounds(tournamentId);
  if (!latest) done("hiba", "Nincs törölhető forduló.");
  const db = createAdminClient();
  await db.from("rounds").delete().eq("id", latest.id);
  if (previous) await db.from("rounds").update({ closed_at: null }).eq("id", previous.id);
  done("uzenet", `A ${latest.number}. forduló törölve.`);
}

async function findProfile(query: string): Promise<Profile | null> {
  const { data } = await createAdminClient().from("profiles").select("*");
  return (
    ((data ?? []) as Profile[]).find(
      (p) => sameName(p.discord_username, query) || sameName(p.karnyx_name, query) || sameName(p.display_name, query),
    ) ?? null
  );
}

export async function addAdmin(formData: FormData) {
  await requireAdmin();
  const query = String(formData.get("query") ?? "").trim();
  const profile = await findProfile(query);
  if (!profile) done("hiba", `Nincs „${query}” nevű felhasználó. Előbb be kell lépnie az oldalra.`);
  await createAdminClient().from("profiles").update({ is_admin: true }).eq("id", profile.id);
  done("uzenet", `${profile.karnyx_name ?? profile.discord_username} mostantól admin.`);
}

export async function removeAdmin(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("profile_id"));
  if (id === me.id) done("hiba", "Saját magadtól nem veheted el az admin jogot.");
  await createAdminClient().from("profiles").update({ is_admin: false }).eq("id", id);
  done("uzenet", "Admin jog elvéve.");
}

/**
 * Admin sets (or clears) another user's Karnyx name, e.g. when someone picked the wrong name
 * or "Nem játszom" by mistake. Same choices as the profile form; names stay unique.
 */
export async function adminSetKarnyxName(formData: FormData) {
  await requireAdmin();
  const profileId = String(formData.get("profile_id"));
  const editUrl = routes.adminUser(profileId);
  const fail = (msg: string): never => {
    revalidatePath(editUrl);
    redirect(`${editUrl}?hiba=${encodeURIComponent(msg)}`);
  };

  const db = createAdminClient();
  const { data: target } = await db.from("profiles").select("*").eq("id", profileId).maybeSingle();
  if (!target) done("hiba", "A felhasználó nem található.");

  const tournament = await getActiveTournament();
  const roster = tournament ? (await getPlayers(tournament.id)).map((p) => p.karnyx_name) : [];
  const choice = resolveKarnyxChoice(
    String(formData.get("karnyx_name") ?? ""),
    roster,
    String(formData.get("karnyx_custom") ?? ""),
  );
  if (!choice.ok) fail(choice.error);
  const name = choice.ok ? choice.name : null;

  // Names are unique: say who holds it instead of a bare database error.
  if (name) {
    const { data: holders } = await db.from("profiles").select("id, discord_username, display_name, karnyx_name");
    const holder = ((holders ?? []) as Profile[]).find((p) => p.id !== profileId && sameName(p.karnyx_name, name));
    if (holder) {
      fail(
        `A(z) „${name}” nevet már ez a felhasználó használja: ${holder.display_name ?? holder.discord_username}. Előbb szabadítsd fel nála.`,
      );
    }
  }

  const { error } = await db.from("profiles").update({ karnyx_name: name }).eq("id", profileId);
  if (error) fail("Mentés sikertelen, próbáld újra.");
  const who = (target as Profile).display_name ?? (target as Profile).discord_username;
  done("uzenet", name ? `${who} Karnyx neve mostantól: ${name}.` : `${who} mostantól nem játszó felhasználó (nincs Karnyx neve).`);
}

export async function releaseNickname(formData: FormData) {
  await requireAdmin();
  await createAdminClient().from("profiles").update({ karnyx_name: null }).eq("id", String(formData.get("profile_id")));
  done("uzenet", "Karnyx név felszabadítva, a játékos újra választhat.");
}

export async function adminMarkPlayed(formData: FormData) {
  await requireAdmin();
  await setMatchPlayed(String(formData.get("match_id")));
  done("uzenet", "Lejátszottként jelölve.");
}

export async function sendReminder(formData: FormData) {
  await requireAdmin();
  const rounds = await getRounds(String(formData.get("tournament_id")));
  const round = rounds[0];
  if (!round) done("hiba", "Nincs futó forduló.");
  if (!process.env.DISCORD_WEBHOOK_URL) done("hiba", "A Discord webhook nincs beállítva (DISCORD_WEBHOOK_URL).");

  const targets = await getReminderTargets(round.id);
  if (targets.unscheduled.length + targets.awaitingAnswer.length === 0) {
    done("uzenet", "Nincs kinek emlékeztetőt küldeni: minden meccsnek van megbeszélt időpontja vagy le van játszva.");
  }

  const { sent, pinged, unregistered } = await notifyReminder(round, targets, await getSiteUrl());
  if (!sent) done("hiba", "Az emlékeztető nem ment ki Discordra. Próbáld újra, vagy nézd meg a webhook beállítást.");
  const parts = [`Emlékeztető elküldve Discordra, ${pinged.length} játékos megjelölve.`];
  if (unregistered.length) {
    parts.push(
      `${unregistered.length} játékos még nem regisztrált, őket csak névvel említettük (érd el őket Facebookon): ${unregistered.map((p) => p.karnyx_name).join(", ")}.`,
    );
  }
  done("uzenet", parts.join(" "));
}

export async function testWebhook() {
  await requireAdmin();
  const ok = await postToDiscord(["🔧 Teszt üzenet a DT Időpontfoglalóból. Ha ezt látod, a Discord értesítések működnek."]);
  done(ok ? "uzenet" : "hiba", ok ? "Teszt üzenet elküldve Discordra." : "A Discord üzenet nem ment el. Ellenőrizd a DISCORD_WEBHOOK_URL beállítást.");
}
