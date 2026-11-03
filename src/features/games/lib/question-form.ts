// Parses and checks the admin question form (spec §5.1). Pure, unit-tested in question-form.test.ts.

import { QUESTION_TYPES, type QuestionType } from "@/features/shop/lib/economy";
import { normalizeAnswer } from "./daily";
import type { QuestionRow } from "./daily-types";

/** Types an admin can pick now. champion_zoom (cropped image) comes in a later step. */
export const SUPPORTED_TYPES: QuestionType[] = QUESTION_TYPES.filter((t) => t !== "champion_zoom");

export type QuestionInput = Pick<
  QuestionRow,
  "type" | "prompt" | "answer_mode" | "options" | "correct_option" | "accepted_answers" | "explanation" | "difficulty" | "reward_override"
> & { status: "draft" | "scheduled"; publish_date: string | null };

/** The fields players' answers depend on: frozen once a question has been answered (spec §5.2.9). */
export const LOCKED_FIELDS = ["answer_mode", "options", "correct_option", "accepted_answers", "difficulty", "reward_override"] as const;

type Fields = Record<string, string | undefined>;

export function parseQuestionForm(f: Fields, today: string): { ok: true; value: QuestionInput } | { ok: false; error: string } {
  const type = f.type as QuestionType;
  if (!SUPPORTED_TYPES.includes(type)) return { ok: false, error: "Válassz kérdéstípust." };
  const prompt = (f.prompt ?? "").trim();
  if (!prompt || prompt.length > 600) return { ok: false, error: "A kérdés szövege 1–600 karakter legyen." };
  const mode = f.answer_mode === "text" ? "text" : f.answer_mode === "multiple_choice" ? "multiple_choice" : null;
  if (!mode) return { ok: false, error: "Válassz válaszformát." };

  let options: string[] | null = null;
  let correct: number | null = null;
  let accepted: string[] | null = null;
  if (mode === "multiple_choice") {
    options = [0, 1, 2, 3, 4, 5].map((i) => (f[`option${i}`] ?? "").trim()).filter(Boolean);
    if (options.length < 2) return { ok: false, error: "Adj meg legalább 2 választ." };
    if (options.some((o) => o.length > 150)) return { ok: false, error: "Egy válasz legfeljebb 150 karakter lehet." };
    if (new Set(options.map(normalizeAnswer)).size !== options.length) return { ok: false, error: "Két válasz ugyanaz." };
    // The radio refers to the option fields as typed (0–5); count only filled ones before it.
    const picked = Number(f.correct_option);
    const filledBefore = [0, 1, 2, 3, 4, 5].slice(0, picked).filter((i) => (f[`option${i}`] ?? "").trim()).length;
    if (!Number.isInteger(picked) || !(f[`option${picked}`] ?? "").trim()) return { ok: false, error: "Jelöld meg a helyes választ." };
    correct = filledBefore;
  } else {
    accepted = (f.accepted_answers ?? "")
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (accepted.length === 0) return { ok: false, error: "Adj meg legalább egy elfogadott választ." };
    if (accepted.some((a) => a.length > 100)) return { ok: false, error: "Egy elfogadott válasz legfeljebb 100 karakter lehet." };
  }

  const explanation = (f.explanation ?? "").trim() || null;
  if (explanation && explanation.length > 1000) return { ok: false, error: "A magyarázat legfeljebb 1000 karakter lehet." };
  const difficulty = f.difficulty === "hard" ? "hard" : "normal";
  const overrideText = (f.reward_override ?? "").trim();
  const reward_override = overrideText === "" ? null : /^\d{1,4}$/.test(overrideText) ? Number(overrideText) : NaN;
  if (Number.isNaN(reward_override)) return { ok: false, error: "Az egyedi jutalom 0 vagy pozitív egész szám legyen, vagy hagyd üresen." };

  const status = f.status === "scheduled" ? "scheduled" : "draft";
  const publish_date = (f.publish_date ?? "").trim() || null;
  if (publish_date && !/^\d{4}-\d{2}-\d{2}$/.test(publish_date)) return { ok: false, error: "Érvénytelen dátum." };
  if (publish_date && publish_date < today) return { ok: false, error: "Múltbeli napra nem lehet ütemezni." };
  if (publish_date && status === "draft") return { ok: false, error: "Piszkozatot nem lehet napra ütemezni: állítsd „Kész” állapotra." };

  return {
    ok: true,
    value: { type, prompt, answer_mode: mode, options, correct_option: correct, accepted_answers: accepted, explanation, difficulty, reward_override, status, publish_date },
  };
}

/** The locked fields that differ between the saved question and the edit. */
export function changedLockedFields(saved: QuestionRow, next: QuestionInput): string[] {
  return LOCKED_FIELDS.filter((k) => JSON.stringify(saved[k] ?? null) !== JSON.stringify(next[k] ?? null));
}

/** Another question with the same prompt (ignoring case, spaces and accents). */
export function findDuplicate(prompt: string, others: { id: string; prompt: string }[], selfId?: string) {
  const key = normalizeAnswer(prompt);
  return others.find((o) => o.id !== selfId && normalizeAnswer(o.prompt) === key) ?? null;
}
