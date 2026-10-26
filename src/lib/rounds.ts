import { notifyRoundComplete } from "./notify";
import { createAdminClient } from "./supabase/server";
import type { Round } from "./types";

/** Marks the match played, closes open proposals, and checks whether the round is now complete. */
export async function setMatchPlayed(matchId: string) {
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
}

/** Marks the round complete (and announces it once) when every match is played or a bye. */
export async function checkRoundComplete(roundId: string) {
  const db = createAdminClient();
  const { count } = await db
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("round_id", roundId)
    .not("status", "in", "(played,bye)");
  if (count !== 0) return;

  const { data } = await db
    .from("rounds")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", roundId)
    .is("completed_at", null)
    .select()
    .maybeSingle();
  if (data) await notifyRoundComplete(data as Round);
}
