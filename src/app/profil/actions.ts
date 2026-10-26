"use server";

import { redirect } from "next/navigation";
import { requireProfile, sameName } from "@/lib/auth";
import { getActiveTournament, getPlayers } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/time";

export async function saveProfile(formData: FormData) {
  const profile = await requireProfile();
  const karnyxName = String(formData.get("karnyx_name") ?? "").trim();
  const facebookName = String(formData.get("facebook_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "");

  const fail = (msg: string) => redirect(`/profil?hiba=${encodeURIComponent(msg)}`);
  if (!karnyxName) fail("Válaszd ki a Karnyx nevedet.");
  if (!facebookName) fail("Add meg a Facebook nevedet, hogy megtaláljanak a csoportban.");
  if (!isValidTimeZone(timezone)) fail("Érvénytelen időzóna.");

  // When a roster exists, the name must be on it (prevents typos).
  const tournament = await getActiveTournament();
  let canonicalName = karnyxName;
  if (tournament) {
    const players = await getPlayers(tournament.id);
    if (players.length > 0) {
      const player = players.find((p) => sameName(p.karnyx_name, karnyxName));
      if (!player) fail("Ez a név nem szerepel a verseny játékosai között.");
      canonicalName = player!.karnyx_name;
    }
  }

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ karnyx_name: canonicalName, facebook_name: facebookName, timezone })
    .eq("id", profile.id);
  if (error?.code === "23505") fail(`A(z) „${canonicalName}” nevet már valaki lefoglalta. Szólj az adminnak.`);
  if (error) fail("Mentés sikertelen, próbáld újra.");

  redirect("/?uzenet=profil");
}
