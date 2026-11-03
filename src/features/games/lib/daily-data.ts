// Read helpers for the daily spin and question (service client). Server only.
// The correct answer and the explanation never leave this file before the player has answered.

import { cache } from "react";
import { questionReward, type Economy } from "@/features/shop/lib/economy";
import { loadEconomy } from "@/features/shop/lib/economy-store";
import { createAdminClient } from "@/lib/supabase/server";
import { budapestDay, nextDailyReset, visibleStreak, weekdayIndex } from "./daily";
import type { AnswerRow, DailyState, PublicQuestion, QuestionRow, Reveal, SpinRow } from "./daily-types";

/** Thrown when migration 0010 is not applied yet; pages catch it and show a notice. */
export class DailyNotReady extends Error {}

const MISSING = /does not exist|schema cache|PGRST205|42P01|42883/i;

function fail(error: { code?: string; message?: string }): never {
  if (MISSING.test(`${error.code ?? ""} ${error.message ?? ""}`)) throw new DailyNotReady();
  throw new Error(error.message);
}

/**
 * The id of the question of `day`. The first call of a day fixes it (scheduled one, else the
 * fallback), so everyone gets the same question. Null when there is nothing to ask.
 */
export const questionIdFor = cache(async (day: string): Promise<string | null> => {
  const e = await loadEconomy();
  const { data, error } = await createAdminClient().rpc("daily_question_for", {
    p_day: day,
    p_fallback: e.dailyFallbackEnabled,
    p_preferred_type: e.dailyTypeSchedule[weekdayIndex(day)],
  });
  if (error) fail(error);
  return (data as string | null) ?? null;
});

export async function getQuestion(id: string): Promise<QuestionRow | null> {
  const { data, error } = await createAdminClient().from("daily_questions").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return (data as QuestionRow | null) ?? null;
}

export function publicQuestion(q: QuestionRow, e: Economy): PublicQuestion {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    answer_mode: q.answer_mode,
    options: q.answer_mode === "multiple_choice" ? q.options : null,
    difficulty: q.difficulty,
    reward: questionReward(q, e),
  };
}

/** The right answer in words: the correct option, or the first accepted answer. */
export function correctText(q: QuestionRow): string {
  if (q.answer_mode === "multiple_choice") return q.options?.[q.correct_option ?? -1] ?? "";
  return q.accepted_answers?.[0] ?? "";
}

type StreakRow = { game: string; current_length: number; last_completed_date: string | null };
const streakOf = (rows: unknown, game: "spin" | "quiz") => ((rows ?? []) as StreakRow[]).find((r) => r.game === game) ?? null;

/** Today's spin, question and answer for a player (or for an anonymous visitor: no player rows). */
export async function getDailyState(profileId: string | null): Promise<DailyState> {
  const e = await loadEconomy();
  const day = budapestDay();
  const db = createAdminClient();
  const qid = await questionIdFor(day);

  const [spinRes, answerRes, streakRes, question] = await Promise.all([
    profileId
      ? db.from("daily_spins").select("day, result_label, coins, created_at").eq("profile_id", profileId).eq("day", day).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    profileId
      ? db.from("daily_question_answers").select("question_id, day, answer, is_correct, coins").eq("profile_id", profileId).eq("day", day).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    profileId
      ? db.from("daily_streaks").select("game, current_length, last_completed_date").eq("profile_id", profileId)
      : Promise.resolve({ data: [], error: null }),
    qid ? getQuestion(qid) : Promise.resolve(null),
  ]);
  for (const r of [spinRes, answerRes, streakRes]) if (r.error) fail(r.error);

  const answer = (answerRes.data as AnswerRow | null) ?? null;
  let reveal: Reveal | null = null;
  if (answer && question) {
    reveal = {
      answer:
        question.answer_mode === "multiple_choice" ? (question.options?.[Number(answer.answer)] ?? answer.answer) : answer.answer,
      isCorrect: answer.is_correct,
      coins: answer.coins,
      correctText: correctText(question),
      explanation: question.explanation,
    };
  }

  return {
    day,
    nextReset: nextDailyReset().toISOString(),
    spin: (spinRes.data as SpinRow | null) ?? null,
    question: question ? publicQuestion(question, e) : null,
    answer,
    reveal,
    spinStreak: visibleStreak(streakOf(streakRes.data, "spin"), day, e.streakLengthDays),
    quizStreak: visibleStreak(streakOf(streakRes.data, "quiz"), day, e.streakLengthDays),
    streakLength: e.streakLengthDays,
    streakBonus: e.streakBonusCoins,
  };
}
