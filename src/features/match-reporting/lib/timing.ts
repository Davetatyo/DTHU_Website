import type { Game } from "./types";

// Unanswered reports: the player who has to answer is pinged on Discord on day 3 and 24 hours
// before expiry; after 7 days the game expires with no effect (never an automatic win). Counted
// from reported_at, which a correction resets. The hourly cron calls these; game_expire
// (migration 0014) uses the same 7 days.

const HOUR_MS = 3_600_000;
export const EXPIRY_HOURS = 7 * 24;
export const FIRST_REMINDER_HOURS = 3 * 24;
export const LAST_REMINDER_HOURS = EXPIRY_HOURS - 24;

type PendingRef = Pick<Game, "status" | "reported_at" | "reminders_sent">;

export function expiresAt(reportedAt: string | Date): Date {
  return new Date(new Date(reportedAt).getTime() + EXPIRY_HOURS * HOUR_MS);
}

export function isExpired(game: PendingRef, now: Date): boolean {
  return game.status === "pending" && now.getTime() >= expiresAt(game.reported_at).getTime();
}

/**
 * Which reminder to send now: 1 (day 3), 2 (last call, 24 hours left) or null. When the cron
 * missed the first one and the last call is already due, only the last call goes out. Nothing
 * for an expired game.
 */
export function reminderDue(game: PendingRef, now: Date): 1 | 2 | null {
  if (game.status !== "pending" || isExpired(game, now)) return null;
  const age = (now.getTime() - new Date(game.reported_at).getTime()) / HOUR_MS;
  if (age >= LAST_REMINDER_HOURS && game.reminders_sent < 2) return 2;
  if (age >= FIRST_REMINDER_HOURS && game.reminders_sent < 1) return 1;
  return null;
}

/**
 * Time left to answer, for the reminder text "… maradt a játszma jóváhagyására": whole days
 * from 2 days up ("4 nap"), hours below that ("24 óra"), never less than 1 hour.
 */
export function timeLeftToAnswer(reportedAt: string | Date, now: Date): string {
  const hours = Math.max(1, Math.ceil((expiresAt(reportedAt).getTime() - now.getTime()) / HOUR_MS));
  return hours > 48 ? `${Math.round(hours / 24)} nap` : `${hours} óra`;
}
