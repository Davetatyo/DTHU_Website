"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getMatch, isParticipant } from "@/lib/data";
import { notifyConfirmed, notifyProposal } from "@/lib/notify";
import { checkRoundComplete } from "@/lib/rounds";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import { wallTimeToUtc } from "@/lib/time";

const MAX_SLOTS = 3;

function back(matchId: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath(`/meccs/${matchId}`);
  redirect(`/meccs/${matchId}?${key}=${encodeURIComponent(text)}`);
}

/** Loads the match and checks that the visitor is one of its players or an admin. */
async function authorize(matchId: string) {
  const profile = await requireProfile();
  const match = await getMatch(matchId);
  if (!match) redirect("/");
  if (!profile.is_admin && !isParticipant(match, profile.karnyx_name)) {
    back(matchId, "hiba", "Ez nem a te meccsed.");
  }
  if (match.status === "bye") back(matchId, "hiba", "Ez egy erőnyerő kör, nincs mit egyeztetni.");
  return { profile, match };
}

export async function proposeTimes(formData: FormData) {
  const matchId = String(formData.get("match_id"));
  const { profile, match } = await authorize(matchId);

  if (match.status === "played") back(matchId, "hiba", "A meccs már le van játszva.");
  if (match.round.closed_at && !profile.is_admin) back(matchId, "hiba", "Ez a forduló már lezárult.");

  const raw = formData.getAll("slot").map(String).filter(Boolean);
  if (raw.length === 0) back(matchId, "hiba", "Adj meg legalább egy időpontot.");

  const now = Date.now();
  const deadline = new Date(match.round.deadline).getTime();
  const slots: Date[] = [];
  for (const value of raw.slice(0, MAX_SLOTS)) {
    let date: Date;
    try {
      date = wallTimeToUtc(value, profile.timezone);
    } catch {
      back(matchId, "hiba", "Érvénytelen időpont.");
    }
    if (date.getTime() < now) back(matchId, "hiba", "Csak jövőbeli időpontot javasolhatsz.");
    if (date.getTime() > deadline && !profile.is_admin) back(matchId, "hiba", "Az időpont a forduló határideje utánra esik.");
    if (!slots.some((s) => s.getTime() === date.getTime())) slots.push(date);
  }

  const db = createAdminClient();
  await db.from("proposals").update({ status: "superseded" }).eq("match_id", matchId).eq("status", "open");
  await db.from("proposals").insert(
    slots.map((s) => ({ match_id: matchId, proposed_by: profile.id, starts_at: s.toISOString() })),
  );
  // A new proposal replaces any earlier agreement.
  await db
    .from("matches")
    .update({ status: "proposed", scheduled_at: null, reminder_sent: false, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  const proposerName = isParticipant(match, profile.karnyx_name) ? profile.karnyx_name! : "Az admin";
  await notifyProposal(match, proposerName, slots, await getSiteUrl());
  back(matchId, "uzenet", "Elküldve! Az ellenfeled értesítést kap Discordon.");
}

export async function acceptProposal(formData: FormData) {
  const matchId = String(formData.get("match_id"));
  const proposalId = String(formData.get("proposal_id"));
  const { profile, match } = await authorize(matchId);

  const db = createAdminClient();
  const { data: proposal } = await db.from("proposals").select("*").eq("id", proposalId).eq("match_id", matchId).maybeSingle();
  if (!proposal || proposal.status !== "open") back(matchId, "hiba", "Ez a javaslat már nem érvényes.");
  if (proposal.proposed_by === profile.id && !profile.is_admin) {
    back(matchId, "hiba", "A saját javaslatodat az ellenfelednek kell elfogadnia.");
  }

  const { data: accepted } = await db
    .from("proposals")
    .update({ status: "accepted" })
    .eq("id", proposalId)
    .eq("status", "open")
    .select()
    .maybeSingle();
  if (!accepted) back(matchId, "hiba", "Ez a javaslat már nem érvényes.");

  await db.from("proposals").update({ status: "declined" }).eq("match_id", matchId).eq("status", "open");
  await db
    .from("matches")
    .update({ status: "confirmed", scheduled_at: proposal.starts_at, reminder_sent: false, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  await notifyConfirmed(match, new Date(proposal.starts_at), await getSiteUrl());
  back(matchId, "uzenet", "Időpont megerősítve! Add hozzá a naptáradhoz.");
}

export async function markPlayed(formData: FormData) {
  const matchId = String(formData.get("match_id"));
  await authorize(matchId);
  const now = new Date().toISOString();
  const db = createAdminClient();
  const { data } = await db
    .from("matches")
    .update({ status: "played", played_at: now, updated_at: now })
    .eq("id", matchId)
    .select("round_id")
    .single();
  await db.from("proposals").update({ status: "superseded" }).eq("match_id", matchId).eq("status", "open");
  if (data) await checkRoundComplete(data.round_id);
  back(matchId, "uzenet", "Lejátszottként jelölve. Az eredményt rögzítsd a Karnyxban!");
}

export async function adminSetTime(formData: FormData) {
  const matchId = String(formData.get("match_id"));
  const { profile, match } = await authorize(matchId);
  if (!profile.is_admin) back(matchId, "hiba", "Csak admin teheti meg.");
  let date: Date;
  try {
    date = wallTimeToUtc(String(formData.get("time")), profile.timezone);
  } catch {
    back(matchId, "hiba", "Érvénytelen időpont.");
  }
  const db = createAdminClient();
  await db.from("proposals").update({ status: "superseded" }).eq("match_id", matchId).eq("status", "open");
  await db
    .from("matches")
    .update({ status: "confirmed", scheduled_at: date.toISOString(), reminder_sent: false, updated_at: new Date().toISOString() })
    .eq("id", matchId);
  await notifyConfirmed(match, date, await getSiteUrl());
  back(matchId, "uzenet", "Időpont beállítva.");
}

export async function adminResetMatch(formData: FormData) {
  const matchId = String(formData.get("match_id"));
  const { profile } = await authorize(matchId);
  if (!profile.is_admin) back(matchId, "hiba", "Csak admin teheti meg.");
  const db = createAdminClient();
  await db.from("proposals").update({ status: "superseded" }).eq("match_id", matchId).eq("status", "open");
  await db
    .from("matches")
    .update({ status: "pending", scheduled_at: null, played_at: null, reminder_sent: false, updated_at: new Date().toISOString() })
    .eq("id", matchId);
  back(matchId, "uzenet", "A meccs visszaállítva időpont nélküli állapotba.");
}
