// Rows of the daily-game tables (supabase/migrations/0010_daily_spin_and_question.sql).

import type { QuestionType } from "@/features/shop/lib/economy";

export type QuestionStatus = "draft" | "scheduled" | "published" | "archived";

export type QuestionRow = {
  id: string;
  type: QuestionType;
  prompt: string;
  answer_mode: "multiple_choice" | "text";
  options: string[] | null;
  correct_option: number | null;
  accepted_answers: string[] | null;
  explanation: string | null;
  difficulty: "normal" | "hard";
  reward_override: number | null;
  status: QuestionStatus;
  publish_date: string | null;
  times_used: number;
  last_used_date: string | null;
  created_at: string;
  updated_at: string;
};

/** What a player may see before answering: no correct answer, no explanation. */
export type PublicQuestion = Pick<QuestionRow, "id" | "type" | "prompt" | "answer_mode" | "options" | "difficulty"> & {
  reward: number;
};

export type SpinRow = { day: string; result_label: string; coins: number; created_at: string };

export type AnswerRow = { question_id: string; day: string; answer: string; is_correct: boolean; coins: number };

/** Shown after the player answered: their answer, the right one, the explanation. */
export type Reveal = {
  answer: string;
  isCorrect: boolean;
  coins: number;
  correctText: string;
  explanation: string | null;
};

export type DailyState = {
  day: string;
  /** ISO time of the next 00:00 Budapest. */
  nextReset: string;
  spin: SpinRow | null;
  question: PublicQuestion | null;
  answer: AnswerRow | null;
  reveal: Reveal | null;
  /** Days in a row (1..streakLength; 0 after a missed day), separately for each game. */
  spinStreak: number;
  quizStreak: number;
  streakLength: number;
  streakBonus: number;
};

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  draft: "Piszkozat",
  scheduled: "Kész",
  published: "Volt már napi kérdés",
  archived: "Archivált",
};
