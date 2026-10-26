"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, sameName } from "@/lib/auth";
import { getPlayers, getRounds } from "@/lib/data";
import { postToDiscord } from "@/lib/discord";
import { parseKarnyxPaste } from "@/lib/karnyx";
import { notifyRoundOpened } from "@/lib/notify";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import { wallTimeToUtc } from "@/lib/time";
import type { Profile } from "@/lib/types";

function done(key: "uzenet" | "hiba", text: string): never {
  revalidatePath("/", "layout");
  redirect(`/admin?${key}=${encodeURIComponent(text)}`);
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

  const rounds = await getRounds(tournamentId);
  const now = new Date().toISOString();
  await db.from("rounds").update({ closed_at: now }).eq("tournament_id", tournamentId).is("closed_at", null);
  const { data: round, error } = await db
    .from("rounds")
    .insert({ tournament_id: tournamentId, number: (rounds[0]?.number ?? 0) + 1, deadline: deadline.toISOString() })
    .select()
    .single();
  if (error || !round) done("hiba", "Nem sikerült létrehozni a fordulót.");

  await db.from("matches").insert(
    pairings.map((pairing) => ({
      round_id: round.id,
      table_no: pairing.tableNo,
      player_a_id: idByName.get(pairing.a.name.toLowerCase()),
      player_b_id: pairing.b ? idByName.get(pairing.b.name.toLowerCase()) : null,
      status: pairing.b ? "pending" : "bye",
    })),
  );

  await notifyRoundOpened(round, await getSiteUrl());
  done("uzenet", `A ${round.number}. forduló elindult ${pairings.length} meccsel.`);
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

export async function releaseNickname(formData: FormData) {
  await requireAdmin();
  await createAdminClient().from("profiles").update({ karnyx_name: null }).eq("id", String(formData.get("profile_id")));
  done("uzenet", "Karnyx név felszabadítva, a játékos újra választhat.");
}

export async function testWebhook() {
  await requireAdmin();
  const ok = await postToDiscord(["🔧 Teszt üzenet a DT Meccsszervezőből. Ha ezt látod, a Discord értesítések működnek."]);
  done(ok ? "uzenet" : "hiba", ok ? "Teszt üzenet elküldve Discordra." : "A Discord üzenet nem ment el. Ellenőrizd a DISCORD_WEBHOOK_URL beállítást.");
}
