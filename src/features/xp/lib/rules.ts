// XP rules that aren't stored in the database. Pure and browser-safe.

import { BADGES, type Badge } from "@/features/profile/lib/badges";

/** Test phase: only admins see XP. Set to false when the full site opens (and wipe test XP first). */
export const XP_ADMINS_ONLY = true;

/** Activity keys the code awards. Amounts live in the database (xp_activities); admins edit them. */
export const ACTIVITY = {
  tournamentGame: "tournament_game",
  tournamentFinish: "tournament_finish",
  podium: ["podium_1", "podium_2", "podium_3"],
  adminManual: "admin_manual",
} as const;

/** Defaults, also what the admin page shows before migration 0012 has run. */
export const DEFAULT_ACTIVITIES: { key: string; name: string; amount: number }[] = [
  { key: "tournament_game", name: "Lejátszott versenymeccs (Bye is)", amount: 15 },
  { key: "tournament_finish", name: "Verseny befejezése", amount: 30 },
  { key: "podium_1", name: "1. hely", amount: 300 },
  { key: "podium_2", name: "2. hely", amount: 200 },
  { key: "podium_3", name: "3. hely", amount: 150 },
  { key: "live_event", name: "Élő esemény", amount: 50 },
  { key: "site_tutorial", name: "Az oldal bemutatója", amount: 25 },
  { key: "tutorial", name: "Egyéb bemutató", amount: 25 },
  { key: "daily_game", name: "A nap játéka", amount: 5 },
  { key: "daily_quiz", name: "Napi kvíz, helyes válasz", amount: 5 },
  { key: "news_like", name: "Hír megerősítése (tetszik)", amount: 5 },
];

const LABELS: Record<string, string> = {
  tournament_game: "Lejátszott meccs",
  tournament_finish: "Verseny befejezve",
  podium_1: "1. hely a versenyen",
  podium_2: "2. hely a versenyen",
  podium_3: "3. hely a versenyen",
  live_event: "Élő esemény",
  site_tutorial: "Az oldal bemutatója",
  tutorial: "Bemutató",
  daily_game: "A nap játéka",
  daily_quiz: "Napi kvíz",
  news_like: "Hír megerősítve",
};

/** What a player sees for one XP row. Admin-given XP shows its reason. */
export function activityLabel(activity: string, reason?: string | null): string {
  if (activity === ACTIVITY.adminManual) return reason || "Admin";
  return reason || LABELS[activity] || activity;
}

/** The badge a level awards, if any (so far: Barbár at 5, Holdtündé at 7). */
export function rewardForLevel(level: number): Badge | null {
  return BADGES.find((b) => b.group === "level" && b.level === level) ?? null;
}

/** The next level above `level` that has a reward, or null. */
export function nextRewardLevel(level: number): number | null {
  const levels = BADGES.filter((b) => b.group === "level" && b.level! > level).map((b) => b.level!);
  return levels.length ? Math.min(...levels) : null;
}

/** A valid hand-given amount: a non-zero multiple of 5 within ±1000. */
export function isValidAdjustment(amount: number): boolean {
  return Number.isInteger(amount) && amount !== 0 && amount % 5 === 0 && Math.abs(amount) <= 1000;
}
