import { createAdminClient } from "@/lib/supabase/server";
import { getMatch, getProfilesByKarnyx, profileFor } from "@/features/match-organizer/lib/data";
import { ACTIVITY } from "./rules";

// Giving XP, server only. The database decides the amount and refuses duplicates (xp_award in
// migration 0012). Awarding never breaks what triggered it: if anything fails (e.g. the
// migration hasn't run yet) it logs and gives 0.

export async function awardXp(
  profileId: string,
  activity: string,
  ref: string,
  opts: { tournamentId?: string | null; by?: string | null; reason?: string | null } = {},
): Promise<number> {
  try {
    const { data, error } = await createAdminClient().rpc("xp_award", {
      p_profile: profileId,
      p_activity: activity,
      p_ref: ref,
      p_tournament: opts.tournamentId ?? null,
      p_by: opts.by ?? null,
      p_reason: opts.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return Number(data) || 0;
  } catch (error) {
    console.error("XP not awarded:", activity, ref, error);
    return 0;
  }
}

/** 15 XP to both players of a match marked played (each player once per match). */
export async function awardMatchPlayed(matchId: string): Promise<void> {
  try {
    const match = await getMatch(matchId);
    if (!match || match.status !== "played" || !match.b) return;
    const profiles = await getProfilesByKarnyx([match.a.karnyx_name, match.b.karnyx_name]);
    for (const player of [match.a, match.b]) {
      const profile = profileFor(profiles, player);
      if (profile) await awardXp(profile.id, ACTIVITY.tournamentGame, `match:${match.id}`, { tournamentId: match.round.tournament_id });
    }
  } catch (error) {
    console.error("XP for a played match failed:", matchId, error);
  }
}
