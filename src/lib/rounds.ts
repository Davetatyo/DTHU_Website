import { notifyRoundComplete } from "./notify";
import { createAdminClient } from "./supabase/server";
import type { Round } from "./types";

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
