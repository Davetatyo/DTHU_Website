// Pure rules of the daily games (spin and daily question): the Budapest day, the next reset and
// answer matching. Unit-tested in daily.test.ts.

import { utcToWallTime, wallTimeToUtc } from "@/features/match-organizer/lib/time";

/** All daily resets use this zone (spec §2), every day starts at 00:00. */
export const DAILY_TIMEZONE = "Europe/Budapest";

/** The Budapest calendar day of an instant, "YYYY-MM-DD". */
export function budapestDay(now: Date = new Date()): string {
  return utcToWallTime(now, DAILY_TIMEZONE).slice(0, 10);
}

/** The calendar day after "YYYY-MM-DD" (or n days later). */
export function addDays(day: string, n = 1): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The next 00:00 in Budapest after `now`, as a UTC instant (daylight saving handled). */
export function nextDailyReset(now: Date = new Date()): Date {
  return wallTimeToUtc(`${addDays(budapestDay(now))}T00:00`, DAILY_TIMEZONE);
}

/** 0 = Monday … 6 = Sunday, for a "YYYY-MM-DD" day. */
export function weekdayIndex(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** "05:12:33" until the reset (never negative). */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Lower case, accents removed, spaces trimmed and collapsed: "  Piromántus " → "piromantus". */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type AnswerKey =
  | { answer_mode: "multiple_choice"; correct_option: number }
  | { answer_mode: "text"; accepted_answers: string[] };

/** Whether a player's answer is right. Multiple choice gets the option index as text. */
export function isCorrectAnswer(key: AnswerKey, answer: string): boolean {
  if (key.answer_mode === "multiple_choice") return /^\d$/.test(answer.trim()) && Number(answer) === key.correct_option;
  const given = normalizeAnswer(answer);
  return given.length > 0 && key.accepted_answers.some((a) => normalizeAnswer(a) === given);
}

/**
 * The streak as the player sees it today, counted 1..length: today's count when they already
 * played; yesterday's while today is still open; 0 after a missed day, and 0 the day after a
 * finished round (that round's last day already showed length/length and paid the bonus).
 */
export function visibleStreak(
  streak: { current_length: number; last_completed_date: string | null } | null,
  today: string,
  length: number,
): number {
  const last = streak?.last_completed_date?.slice(0, 10); // a date, whatever format it came in
  if (!last || !streak) return 0;
  if (last === today) return streak.current_length;
  if (last === addDays(today, -1)) return streak.current_length >= length ? 0 : streak.current_length;
  return 0;
}
