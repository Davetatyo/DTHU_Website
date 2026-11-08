import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_CURVE, isValidCurve, levelInfo, type Curve, type LevelInfo } from "./levels";
import { activityLabel, DEFAULT_ACTIVITIES, XP_ADMINS_ONLY } from "./rules";

// Reads, server only. Every read copes with migration 0012 not having run yet (the tables are
// missing): it returns the defaults or nothing, so no page breaks.

export type XpEvent = {
  id: string;
  activity: string;
  amount: number;
  multiplier: number;
  reason: string | null;
  created_at: string;
  label: string;
};

export type XpActivity = { key: string; name: string; amount: number; active: boolean };

export type XpBoost = {
  id: string;
  multiplier: number;
  starts_at: string | null;
  ends_at: string | null;
  activity_keys: string[] | null;
  tournament_id: string | null;
  note: string | null;
};

/** Whether this visitor sees XP: admins only in the test phase, later everyone logged in. */
export async function canSeeXp(): Promise<boolean> {
  if (XP_ADMINS_ONLY) return getAdminView();
  return !!(await getCurrentProfile());
}

export async function getCurve(): Promise<Curve> {
  const { data } = await createAdminClient().from("xp_config").select("value").eq("key", "curve").maybeSingle();
  const value = data?.value as Partial<Curve> | undefined;
  const curve = { first: Number(value?.first), step: Number(value?.step) };
  return isValidCurve(curve) ? curve : DEFAULT_CURVE;
}

export async function getXpTotal(profileId: string): Promise<number> {
  const { data } = await createAdminClient().from("xp_events").select("amount").eq("profile_id", profileId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

function toEvent(row: Record<string, unknown>): XpEvent {
  return {
    id: row.id as string,
    activity: row.activity as string,
    amount: row.amount as number,
    multiplier: row.multiplier as number,
    reason: (row.reason as string | null) ?? null,
    created_at: row.created_at as string,
    label: activityLabel(row.activity as string, row.reason as string | null),
  };
}

export async function getXpHistory(profileId: string, limit = 50): Promise<XpEvent[]> {
  const { data } = await createAdminClient()
    .from("xp_events")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toEvent);
}

export type XpSummary = { info: LevelInfo; recent: XpEvent[] };

export async function getXpSummary(profileId: string): Promise<XpSummary> {
  const [total, curve, recent] = await Promise.all([getXpTotal(profileId), getCurve(), getXpHistory(profileId, 4)]);
  return { info: levelInfo(total, curve), recent };
}

/** XP the player hasn't been shown yet, with the totals before and after it. */
export async function getUnseenXp(profileId: string): Promise<{ events: XpEvent[]; before: LevelInfo; after: LevelInfo } | null> {
  const { data } = await createAdminClient()
    .from("xp_events")
    .select("*")
    .eq("profile_id", profileId)
    .is("seen_at", null)
    .order("created_at");
  const events = (data ?? []).map(toEvent);
  if (events.length === 0) return null;
  const [total, curve] = await Promise.all([getXpTotal(profileId), getCurve()]);
  const gained = events.reduce((sum, e) => sum + e.amount, 0);
  return { events, before: levelInfo(total - gained, curve), after: levelInfo(total, curve) };
}

/** The activities and their amounts, and whether the tables exist yet. */
export async function getActivities(): Promise<{ ready: boolean; rows: XpActivity[] }> {
  const { data, error } = await createAdminClient().from("xp_activities").select("*").order("sort_order");
  if (error) return { ready: false, rows: DEFAULT_ACTIVITIES.map((a) => ({ ...a, active: true })) };
  return { ready: true, rows: (data ?? []) as XpActivity[] };
}

export async function getBoosts(): Promise<XpBoost[]> {
  const { data } = await createAdminClient().from("xp_boosts").select("*").order("created_at", { ascending: false });
  return (data ?? []) as XpBoost[];
}
