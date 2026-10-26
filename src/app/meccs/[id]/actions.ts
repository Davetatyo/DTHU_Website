"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile, sameName } from "@/lib/auth";
import { getMatch, isParticipant } from "@/lib/data";
import { notifyConfirmed, notifyProposal } from "@/lib/notify";
import { setMatchPlayed } from "@/lib/rounds";
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
  if (match.status === "bye") back(matchId, "hiba", "Ez egy Bye, nincs mit egyeztetni.");
  return { profile, match };
}

export async function proposeTimes(formData: FormData) {
  const matchId = String(formData.get("match_id"));
  const { profile, match } = await authorize(matchId);

  if (match.status === "played") back(matchId, "hiba", "A meccs már le van játszva.");
  if (match.round.closed_at) back(matchId, "hiba", "Ez a forduló már lezárult.");

  const raw = formData.getAll("slot").map(String).filter(Boolean);
  if (raw.length === 0) back(matchId, "hiba", "Válassz legalább egy időpontot.");

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
    // Applies to admins too; only adminSetTime may schedule past the deadline.
    if (date.getTime() > deadline) back(matchId, "hiba", "Az időpont a forduló határideje utánra esik.");
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

  // Players answer their opponent's proposal; an admin's proposal goes to both players.
  const playing = isParticipant(match, profile.karnyx_name);
  const recipients = playing
    ? [sameName(match.a.karnyx_name, profile.karnyx_name) ? match.b! : match.a]
    : [match.a, match.b!];
  const proposerName = playing ? profile.karnyx_name! : "Az admin";
  const { notified, unregistered, failed } = await notifyProposal(match, recipients, proposerName, slots, await getSiteUrl());

  const list = (players: { karnyx_name: string }[]) => players.map((p) => p.karnyx_name).join(" és ");
  const parts = ["Javaslat elmentve."];
  if (notified.length) parts.push(`${list(notified)} értesítést kapott Discordon.`);
  if (unregistered.length) {
    parts.push(
      `${list(unregistered)} még nem regisztrált az oldalon, ezért nem kapott értesítést. Küldd el neki a meccs linkjét Facebookon az „Üzenet másolása” gombbal.`,
    );
  }
  if (failed) parts.push("A Discord értesítés nem ment ki, küldd el a linket Facebookon.");
  back(matchId, "uzenet", parts.join(" "));
}

export async function acceptProposal(formData: FormData) {
  const matchId = String(formData.get("match_id"));
  const proposalId = String(formData.get("proposal_id"));
  const { profile, match } = await authorize(matchId);

  const db = createAdminClient();
  const { data: proposal } = await db.from("proposals").select("*").eq("id", proposalId).eq("match_id", matchId).maybeSingle();
  if (!proposal || proposal.status !== "open") back(matchId, "hiba", "Ez a javaslat már nem érvényes.");
  // The proposer never accepts their own times, even as admin: the other side decides.
  if (proposal.proposed_by === profile.id) {
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
  await setMatchPlayed(matchId);
  back(matchId, "uzenet", "Lejátszottként jelölve. Az eredményt rögzítsétek a Karnyxban!");
}

export async function adminSetTime(formData: FormData) {
  const matchId = String(formData.get("match_id"));
  const { profile, match } = await authorize(matchId);
  if (!profile.is_admin) back(matchId, "hiba", "Csak admin teheti meg.");
  let date: Date;
  try {
    date = wallTimeToUtc(String(formData.get("slot")), profile.timezone);
  } catch {
    back(matchId, "hiba", "Válassz egy időpontot.");
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
