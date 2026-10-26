"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getActiveTournament, getPlayers } from "@/lib/data";
import { resolveKarnyxChoice } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/time";

export async function saveProfile(formData: FormData) {
  const profile = await requireProfile();
  const facebookName = String(formData.get("facebook_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "");

  const fail = (msg: string) => redirect(`/profil?hiba=${encodeURIComponent(msg)}`);
  if (!facebookName) fail("Add meg a Facebook nevedet, hogy megtaláljanak a csoportban.");
  if (!isValidTimeZone(timezone)) fail("Érvénytelen időzóna.");

  // Players pick their name from the roster (prevents typos); organisers and spectators
  // choose "not playing" and save without a Karnyx name, so they claim nobody's name.
  const tournament = await getActiveTournament();
  const roster = tournament ? (await getPlayers(tournament.id)).map((p) => p.karnyx_name) : [];
  const choice = resolveKarnyxChoice(String(formData.get("karnyx_name") ?? ""), roster);
  if (!choice.ok) fail(choice.error);
  const karnyxName = choice.ok ? choice.name : null;

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ karnyx_name: karnyxName, facebook_name: facebookName, timezone })
    .eq("id", profile.id);
  if (error?.code === "23505") fail(`A(z) „${karnyxName}” nevet már valaki lefoglalta. Szólj az adminnak.`);
  if (error) fail("Mentés sikertelen, próbáld újra.");

  redirect("/?uzenet=profil");
}
