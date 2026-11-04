"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { isDiscordId, isJoinUrl } from "../lib/rules";

function done(key: "uzenet" | "hiba", text: string): never {
  revalidatePath("/", "layout");
  redirect(`${routes.admin}?${key}=${encodeURIComponent(text)}`);
}

export async function addLiveChannel(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const joinUrl = String(formData.get("join_url") ?? "").trim();
  if (!isDiscordId(id)) done("hiba", "A csatorna azonosítója csak számokból áll (Discordon: jobb klikk a csatornán → Csatornaazonosító másolása).");
  if (!name || name.length > 60) done("hiba", "Adj nevet a csatornának (legfeljebb 60 karakter).");
  if (joinUrl && !isJoinUrl(joinUrl)) done("hiba", "A link csak discord.com vagy discord.gg link lehet.");
  const { error } = await createAdminClient()
    .from("live_channels")
    .upsert({ discord_channel_id: id, name, join_url: joinUrl || null });
  if (error) done("hiba", "Nem sikerült menteni. Lefutott a 0011-es migráció?");
  done("uzenet", `„${name}” csatorna mentve.`);
}

export async function removeLiveChannel(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await createAdminClient().from("live_channels").delete().eq("discord_channel_id", id);
  done("uzenet", "Csatorna törölve.");
}

/** Manual backup: puts a match on the banner without the bot, for at least 1.5 hours. */
export async function startLiveMatch(formData: FormData) {
  await requireAdmin();
  const matchId = String(formData.get("match_id") ?? "");
  const channelId = String(formData.get("channel_id") ?? "");
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("match_live")
    .upsert({ match_id: matchId, channel_id: channelId || null, started_at: now, last_seen_at: now, ended_at: null, source: "admin" });
  if (error) done("hiba", "Nem sikerült elindítani. Lefutott a 0011-es migráció?");
  done("uzenet", "A meccs élőre állítva.");
}

export async function stopLiveMatch(formData: FormData) {
  await requireAdmin();
  const matchId = String(formData.get("match_id") ?? "");
  await createAdminClient().from("match_live").update({ ended_at: new Date().toISOString() }).eq("match_id", matchId);
  done("uzenet", "Az élő adás jelzése leállítva.");
}
