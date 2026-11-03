"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pickSpin, questionReward } from "@/features/shop/lib/economy";
import { loadEconomy } from "@/features/shop/lib/economy-store";
import { getCurrentProfile, requireProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { budapestDay, isCorrectAnswer, nextDailyReset } from "../lib/daily";
import { getQuestion, questionIdFor } from "../lib/daily-data";
import { dailyErrorMessage } from "../lib/daily-errors";

// The player's daily spin and daily answer. The server decides everything: the day (Budapest),
// the prize (crypto-random), whether an answer is right and what it pays. The database
// functions store each once (migration 0010).

export type SpinResult =
  | { ok: true; index: number; label: string; coins: number; streakBonus: number; nextReset: string }
  | { ok: false; error: string };

function refresh() {
  revalidatePath(routes.games, "layout");
  revalidatePath(routes.shop);
}

/** Spins today's wheel. Returns the prize so the wheel can stop on it. */
export async function spinToday(): Promise<SpinResult> {
  const me = await getCurrentProfile();
  if (!me) return { ok: false, error: "Lépj be a pörgetéshez." };
  const e = await loadEconomy();
  const day = budapestDay();
  const index = pickSpin(e.spinTable, randomInt);
  const prize = e.spinTable[index];
  const { data, error } = await createAdminClient().rpc("daily_spin", {
    p_profile: me.id,
    p_day: day,
    p_label: prize.label,
    p_coins: prize.coins,
    p_streak_length: e.streakLengthDays,
    p_streak_bonus: e.streakBonusCoins,
  });
  if (error) return { ok: false, error: dailyErrorMessage(error) };
  // No revalidatePath here: it would re-render this page, which sends players who already spun
  // back to the Játékok page before the wheel stops. The pages are dynamic, so the next
  // navigation shows the new state anyway.
  const r = data as { coins: number; streak_bonus: number };
  return { ok: true, index, label: prize.label, coins: r.coins, streakBonus: r.streak_bonus, nextReset: nextDailyReset().toISOString() };
}

/** Answers today's question (one attempt). */
export async function answerToday(formData: FormData) {
  const me = await requireProfile();
  const back: (key: "uzenet" | "hiba", text: string) => never = (key, text) => {
    refresh();
    // eredmeny=1: show the answer once right after answering; later visits go to the Játékok page.
    redirect(`${routes.dailyQuiz}?eredmeny=1&${key}=${encodeURIComponent(text)}`);
  };
  const e = await loadEconomy();
  const day = budapestDay();
  const qid = await questionIdFor(day);
  if (!qid || String(formData.get("question_id")) !== qid) back("hiba", "Közben új nap kezdődött, töltsd újra az oldalt.");
  const q = await getQuestion(qid);
  if (!q) back("hiba", "A kérdés nem található.");
  const answer = String(formData.get("answer") ?? "").trim().slice(0, 200);
  if (!answer) back("hiba", q.answer_mode === "multiple_choice" ? "Válassz egy választ." : "Írd be a válaszodat.");

  const correct =
    q.answer_mode === "multiple_choice"
      ? isCorrectAnswer({ answer_mode: "multiple_choice", correct_option: q.correct_option ?? -1 }, answer)
      : isCorrectAnswer({ answer_mode: "text", accepted_answers: q.accepted_answers ?? [] }, answer);
  const { data, error } = await createAdminClient().rpc("daily_answer", {
    p_profile: me.id,
    p_day: day,
    p_question: q.id,
    p_answer: answer,
    p_correct: correct,
    p_coins: questionReward(q, e),
    p_streak_length: e.streakLengthDays,
    p_streak_bonus: e.streakBonusCoins,
  });
  if (error) back("hiba", dailyErrorMessage(error));
  const r = data as { coins: number; streak_bonus: number };
  const bonus = r.streak_bonus > 0 ? ` Sorozat teljesítve: +${r.streak_bonus} bónusz coin!` : "";
  back("uzenet", correct ? `Helyes! +${r.coins} DTHU coin.${bonus}` : `Most nem talált.${bonus}`);
}
